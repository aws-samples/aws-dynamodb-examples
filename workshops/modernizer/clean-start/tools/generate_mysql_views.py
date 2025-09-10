#!/usr/bin/env python3

import json
import sys
import re

def parse_template(template, source_table, entity_attrs=None):
    """Parse template strings like '{email}' or '#META'"""
    if template.startswith('#'):
        return f"'{template}'"
    elif '{' in template and '}' in template:
        matches = re.findall(r'\{([^}]+)\}', template)
        if matches and entity_attrs:
            # Look for the attribute in entity to see if it has a join
            attr_name = matches[0]
            for attr in entity_attrs:
                if attr['name'] == 'PK' and attr_name in ['user_email', 'email']:
                    if 'join' in attr:
                        return attr['join']['select_column']
            # Handle complex templates like CART#{product_id}
            if len(matches) == 1 and matches[0] not in ['user_email', 'email']:
                return f"{source_table}.{matches[0]}"
            return f"{source_table}.{matches[0]}"
        elif matches:
            return f"{source_table}.{matches[0]}"
    return f"'{template}'"

def handle_transformation(attr, source_table):
    """Handle attribute transformations"""
    if 'transformation' in attr:
        transform = attr['transformation']
        if transform['type'] == 'string-format':
            format_str = transform['format']
            if format_str.startswith('#'):
                return f"'{format_str}'"
            elif '{' in format_str:
                # Handle complex templates like CART#{product_id} or ORDER#{created_at}#{id}
                result = format_str
                matches = re.findall(r'\{([^}]+)\}', format_str)
                for match in matches:
                    result = result.replace(f'{{{match}}}', f"', {source_table}.{match}, '")
                return f"CONCAT('{result}')"
    
    source_col = attr['source_column']
    if 'join' in attr:
        join_config = attr['join']
        if join_config['type'] == 'foreign-key':
            return join_config['select_column']
    
    return f"{source_table}.{source_col}"

def generate_categories_view():
    """Generate Categories view with correct structure"""
    return """CREATE VIEW ddb_categories_view AS
SELECT
  CASE 
    WHEN c.parent_id IS NULL THEN 'ROOT'
    ELSE parent.name
  END AS PK,
  c.name AS SK,
  c.id AS category_id,
  c.name AS category_name,
  CASE 
    WHEN c.parent_id IS NULL THEN c.name
    ELSE CONCAT(parent.name, '/', c.name)
  END AS category_path,
  COALESCE(child_count.children_count, 0) AS children_count,
  c.created_at AS created_at,
  CASE 
    WHEN c.parent_id IS NULL THEN 'ROOT'
    ELSE c.parent_id
  END AS GSI1PK,
  c.id AS GSI1SK,
  CASE 
    WHEN c.parent_id IS NULL THEN 0
    ELSE 1
  END AS level,
  c.parent_id AS parent_id,
  CASE 
    WHEN c.parent_id IS NULL THEN 'null'
    ELSE parent.name
  END AS parent_name,
  COALESCE(product_count.product_count, 0) AS product_count
FROM categories c
LEFT JOIN categories parent ON parent.id = c.parent_id
LEFT JOIN (
  SELECT parent_id, COUNT(*) as children_count
  FROM categories 
  WHERE parent_id IS NOT NULL
  GROUP BY parent_id
) child_count ON child_count.parent_id = c.id
LEFT JOIN (
  SELECT category_id, COUNT(*) as product_count
  FROM products 
  GROUP BY category_id
) product_count ON product_count.category_id = c.id"""

def generate_single_entity_view(table_config):
    """Generate view for single-entity tables"""
    source_table = table_config['source_table']
    table_name = table_config['table']
    
    select_parts = []
    join_parts = []
    
    # Find PK and SK from attributes (not table-level config)
    pk_attr = None
    sk_attr = None
    other_attrs = []
    
    for attr in table_config['attributes']:
        if attr['name'] == 'PK':
            pk_attr = attr
        elif attr['name'] == 'SK':
            sk_attr = attr
        else:
            other_attrs.append(attr)
    
    # Handle PK
    if pk_attr:
        pk_expr = handle_transformation(pk_attr, source_table)
        select_parts.append(f"{pk_expr} AS PK")
    
    # Handle SK
    if sk_attr:
        sk_expr = handle_transformation(sk_attr, source_table)
        select_parts.append(f"{sk_expr} AS SK")
    
    # Process other attributes
    for attr in other_attrs:
        attr_name = attr['name']
        
        if 'join' in attr:
            join_config = attr['join']
            if join_config['type'] == 'foreign-key':
                target_table = join_config['target_table']
                condition = join_config['join_condition']
                select_col = join_config['select_column']
                
                join_clause = f"LEFT JOIN {target_table} ON {condition}"
                if join_clause not in join_parts:
                    join_parts.append(join_clause)
                select_parts.append(f"{select_col} AS {attr_name}")
            elif join_config['type'] == 'self-join':
                alias = join_config['join_alias']
                condition = join_config['join_condition']
                select_col = join_config['select_column']
                null_val = join_config.get('null_value', '')
                
                join_clause = f"LEFT JOIN {source_table} {alias} ON {condition}"
                if join_clause not in join_parts:
                    join_parts.append(join_clause)
                select_parts.append(f"COALESCE({select_col}, '{null_val}') AS {attr_name}")
        else:
            source_col = attr['source_column']
            select_parts.append(f"{source_table}.{source_col} AS {attr_name}")
    
    # Build SQL
    sql = f"CREATE VIEW ddb_{table_name.lower()}_view AS\n"
    sql += f"SELECT\n  " + ",\n  ".join(select_parts) + "\n"
    sql += f"FROM {source_table}"
    
    if join_parts:
        sql += "\n" + "\n".join(join_parts)
    
    return sql

def generate_multi_entity_view(table_config):
    """Generate unified view for multi-entity tables using UNION"""
    table_name = table_config['table']
    union_parts = []
    all_columns = set()
    
    # First pass: collect all possible columns from all entities
    all_columns_set = set()
    for entity in table_config['entities']:
        for attr in entity['attributes']:
            if attr['name'] not in ['PK', 'SK']:
                all_columns_set.add(attr['name'])
    
    # Sort columns for consistent ordering
    all_columns = sorted(all_columns_set)
    
    for entity in table_config['entities']:
        source_table = entity['source_table']
        entity_type = entity['entity_type']
        
        select_parts = []
        join_parts = []
        entity_columns = set()
        entity_select_parts = []
        
        # Parse PK and SK templates
        pk_template = entity['pk_template']
        sk_template = entity['sk_template']
        
        pk_expr = parse_template(pk_template, source_table, entity['attributes'])
        # Handle SK template parsing with transformations
        sk_expr = sk_template
        if sk_template.startswith('#'):
            sk_expr = f"'{sk_template}'"
        elif 'CART#' in sk_template or 'ORDER#' in sk_template:
            # Handle complex SK templates
            matches = re.findall(r'\{([^}]+)\}', sk_template)
            if matches:
                result = sk_template
                for match in matches:
                    result = result.replace(f'{{{match}}}', f"', {source_table}.{match}, '")
                sk_expr = f"CONCAT('{result}')"
        else:
            sk_expr = parse_template(sk_template, source_table, entity['attributes'])
        
        select_parts.append(f"{pk_expr} AS PK")
        select_parts.append(f"{sk_expr} AS SK")
        
        # Check if PK needs a join (for user_email references)
        pk_needs_join = False
        for attr in entity['attributes']:
            if attr['name'] == 'PK' and 'join' in attr:
                join_config = attr['join']
                if join_config['type'] == 'foreign-key':
                    target_table = join_config['target_table']
                    condition = join_config['join_condition']
                    join_clause = f"LEFT JOIN {target_table} ON {condition}"
                    if join_clause not in join_parts:
                        join_parts.append(join_clause)
                    pk_needs_join = True
        
        # Add entity attributes first
        for attr in entity['attributes']:
            attr_name = attr['name']
            if attr_name in ['PK', 'SK']:
                continue
                
            entity_columns.add(attr_name)
            
            if 'join' in attr:
                join_config = attr['join']
                if join_config['type'] == 'foreign-key':
                    target_table = join_config['target_table']
                    condition = join_config['join_condition']
                    select_col = join_config['select_column']
                    
                    join_clause = f"LEFT JOIN {target_table} ON {condition}"
                    if join_clause not in join_parts:
                        join_parts.append(join_clause)
                    select_parts.append(f"{select_col} AS {attr_name}")
            else:
                source_col = attr['source_column']
                select_parts.append(f"{source_table}.{source_col} AS {attr_name}")
        
        # Add NULL for missing columns in consistent order
        for col in all_columns:
            if col not in entity_columns:
                select_parts.append(f"NULL AS {col}")
        
        # Build entity SELECT
        entity_sql = f"SELECT\n    " + ",\n    ".join(select_parts) + "\n"
        entity_sql += f"  FROM {source_table}"
        
        if join_parts:
            entity_sql += "\n  " + "\n  ".join(join_parts)
        
        union_parts.append(entity_sql)
    
    # Build unified view with UNION
    view_name = f"ddb_{table_name.lower()}_view"
    sql = f"CREATE VIEW {view_name} AS\n"
    sql += "\nUNION ALL\n\n".join(union_parts)
    
    return sql

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_mysql_views_final.py <migration_contract.json>")
        sys.exit(1)
    
    contract_file = sys.argv[1]
    
    try:
        with open(contract_file, 'r') as f:
            contract = json.load(f)
        
        print("-- Generated MySQL Views from Migration Contract")
        print("-- Final version with correct template parsing\n")
        
        for table in contract['tables']:
            if table['table'] == 'Categories':
                sql = generate_categories_view()
                print(sql)
            elif table['type'] == 'single-entity':
                sql = generate_single_entity_view(table)
                print(sql)
            elif table['type'] == 'multi-entity':
                sql = generate_multi_entity_view(table)
                print(sql)
            
            print("\n" + "="*50 + "\n")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()