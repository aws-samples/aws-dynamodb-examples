#!/usr/bin/env python3
import json
import argparse

def load_contract(file_path):
    with open(file_path, 'r') as f:
        contract = json.load(f)
        if isinstance(contract, dict) and 'tables' in contract:
            return contract['tables']
        return contract

def get_table_config(contract, table_name):
    tables = contract if isinstance(contract, list) else contract.get('tables', [])
    return next((table for table in tables if table['table'] == table_name), None)

def build_join_expression(attr, source_table_name):
    """Build SQL expression for join patterns"""
    join_config = attr.get('join', {})
    join_type = join_config.get('type')
    
    if join_type == 'foreign-key':
        return join_config.get('select_column', f"{source_table_name}.{attr['source_column']}")
    elif join_type == 'self-join':
        alias = join_config.get('join_alias', 'parent_cat')
        select_col = join_config.get('select_column')
        null_value = join_config.get('null_value', 'NULL')
        return f"COALESCE({select_col}, '{null_value}')"
    elif join_type == 'conditional':
        condition = join_config.get('condition')
        select_col = join_config.get('select_column')
        else_value = join_config.get('else_value', 'NULL')
        return f"CASE WHEN {condition} THEN {select_col} ELSE '{else_value}' END"
    elif join_type == 'chain':
        separator = join_config.get('chain_separator', ' > ')
        joins = join_config.get('joins', [])
        if len(joins) >= 2:
            return f"CONCAT_WS('{separator}', {joins[0]['select_column']}, {joins[1]['select_column']})"
    elif join_type == 'json-construction':
        construction = join_config.get('construction', {})
        if construction.get('type') == 'object':
            select_cols = construction.get('select_columns', {})
            json_pairs = [f"'{k}', {v}" for k, v in select_cols.items()]
            return f"JSON_OBJECT({', '.join(json_pairs)})"
        elif construction.get('type') == 'array':
            select_cols = construction.get('select_columns', {})
            json_pairs = [f"'{k}', {v}" for k, v in select_cols.items()]
            return f"JSON_ARRAYAGG(JSON_OBJECT({', '.join(json_pairs)}))"
    
    source_column = attr.get('source_column')
    if isinstance(source_column, list):
        return f"{source_table_name}.{source_column[0]}"
    return f"{source_table_name}.{source_column}"

def build_calculation_expression(attr, source_table_name):
    """Build SQL expression for calculations"""
    calc_config = attr.get('calculation', {})
    calc_type = calc_config.get('type')
    
    if calc_type == 'aggregate':
        operation = calc_config.get('operation', 'COUNT')
        select_col = calc_config.get('select_column', '*')
        return f"{operation}({select_col})"
    elif calc_type == 'case':
        cases = calc_config.get('cases', [])
        else_clause = calc_config.get('else', '0')
        case_parts = []
        for case in cases:
            when_clause = case.get('when')
            then_clause = case.get('then')
            case_parts.append(f"WHEN {when_clause} THEN {then_clause}")
        return f"CASE {' '.join(case_parts)} ELSE {else_clause} END"
    
    source_column = attr.get('source_column')
    if isinstance(source_column, list):
        return f"{source_table_name}.{source_column[0]}"
    return f"{source_table_name}.{source_column}"

def build_transformation_expression(attr, source_table_name):
    """Build SQL expression for transformations"""
    transform_config = attr.get('transformation', {})
    transform_type = transform_config.get('type')
    
    if transform_type == 'static':
        return f"'{transform_config.get('value', '')}'"
    elif transform_type == 'string-format':
        format_str = transform_config.get('format', '')
        source_column = attr.get('source_column')
        
        # Handle array source columns
        if isinstance(source_column, list):
            # For formats like "ORDER#{created_at}#{id}"
            if format_str == "ORDER#{created_at}#{id}":
                return f"CONCAT('ORDER#', {source_table_name}.{source_column[0]}, '#', {source_table_name}.{source_column[1]})"
            elif format_str == "USER#{created_at}#{user_id}":
                return f"CONCAT('USER#', {source_table_name}.{source_column[0]}, '#', {source_table_name}.{source_column[1]})"
            else:
                # Generic handling for array columns
                concat_parts = ["'" + format_str.split('{')[0] + "'"]
                for i, col in enumerate(source_column):
                    concat_parts.append(f"{source_table_name}.{col}")
                    if i < len(source_column) - 1:
                        concat_parts.append("'#'")
                return f"CONCAT({', '.join(concat_parts)})"
        else:
            # Handle single source column
            if format_str == "CART#{product_id}":
                return f"CONCAT('CART#', {source_table_name}.{source_column})"
            elif format_str == "USER#{email}":
                return f"CONCAT('USER#', {source_table_name}.{source_column})"
            else:
                # Generic string format replacement
                placeholder = '{' + source_column + '}'
                if placeholder in format_str:
                    prefix = format_str.split(placeholder)[0]
                    suffix = format_str.split(placeholder)[1] if len(format_str.split(placeholder)) > 1 else ''
                    if suffix:
                        return f"CONCAT('{prefix}', {source_table_name}.{source_column}, '{suffix}')"
                    else:
                        return f"CONCAT('{prefix}', {source_table_name}.{source_column})"
                return f"'{format_str}'"
    elif transform_type == 'template':
        template = transform_config.get('template', '')
        # Legacy template handling
        if 'product_id' in template:
            return f"CONCAT('CART#', {source_table_name}.product_id)"
        elif 'created_at' in template and 'order_id' in template:
            return f"CONCAT('ORDER#', {source_table_name}.created_at, '#', {source_table_name}.id)"
        elif template.startswith('USER#'):
            if '{user_email}' in template:
                return f"CONCAT('USER#', users.email)"
            elif '{email}' in template:
                return f"CONCAT('USER#', {source_table_name}.email)"
        return f"'{template}'"
    
    # Fallback - handle source_column as array or string
    source_column = attr.get('source_column')
    if isinstance(source_column, list):
        return f"{source_table_name}.{source_column[0]}"  # Use first column as fallback
    return f"{source_table_name}.{source_column}"

def collect_join_tables(attributes):
    """Collect all tables that need to be joined"""
    join_info = {}
    
    for attr in attributes:
        if 'join' in attr:
            join_config = attr['join']
            join_type = join_config.get('type')
            
            if join_type == 'foreign-key':
                target_table = join_config.get('target_table')
                join_condition = join_config.get('join_condition')
                if target_table and join_condition:
                    join_info[target_table] = join_condition
            
            elif join_type == 'self-join':
                # Handle self-joins with aliases - need to include base table name
                join_alias = join_config.get('join_alias', 'parent_cat')
                join_condition = join_config.get('join_condition')
                if join_condition:
                    # Extract base table from join condition
                    base_table = 'categories'  # Default for self-joins
                    join_info[f"{base_table} {join_alias}"] = join_condition
            
            elif join_type == 'chain':
                # Handle chain joins (like category hierarchy)
                joins = join_config.get('joins', [])
                for chain_join in joins:
                    target_table = chain_join.get('target_table')
                    join_condition = chain_join.get('join_condition')
                    if target_table and join_condition:
                        # For chain joins, we need to handle table aliases
                        if 'parent_categories' in join_condition:
                            join_info['categories parent_categories'] = join_condition
                        else:
                            join_info[target_table] = join_condition
            
            elif join_type == 'json-construction':
                target_table = join_config.get('target_table')
                join_condition = join_config.get('join_condition')
                if target_table and join_condition:
                    join_info[target_table] = join_condition
        
        if 'calculation' in attr:
            calc_config = attr['calculation']
            if calc_config.get('type') == 'aggregate':
                target_table = calc_config.get('target_table')
                join_condition = calc_config.get('join_condition')
                if target_table and join_condition:
                    join_info[target_table] = join_condition
    
    return join_info

def collect_all_attributes(entities):
    """Collect all unique attributes across all entities for UNION compatibility"""
    all_attrs = {}
    for entity in entities:
        for attr in entity.get('attributes', []):
            attr_name = attr['name']
            attr_type = attr.get('type', 'S')
            all_attrs[attr_name] = attr_type
    return all_attrs

def generate_single_entity_sql(entity, table_name, all_attributes):
    """Generate SQL SELECT for a single entity (for use in UNION)"""
    entity_type = entity.get('entity_type', 'UNKNOWN')
    source_table = entity.get('source_table')
    attributes = entity.get('attributes', [])
    
    if not attributes or not source_table:
        return None
    
    # Create a map of this entity's attributes
    entity_attrs = {attr['name']: attr for attr in attributes}
    
    select_parts = []
    join_info = collect_join_tables(attributes)
    
    # Generate SELECT for all attributes (including NULLs for missing ones)
    for attr_name, attr_type in all_attributes.items():
        if attr_name in entity_attrs:
            # This entity has this attribute
            attr = entity_attrs[attr_name]
            source_table_name = attr.get('source_table', source_table)
            
            # Build the expression based on attribute type
            if 'transformation' in attr:
                expr = build_transformation_expression(attr, source_table_name)
            elif 'join' in attr:
                expr = build_join_expression(attr, source_table_name)
            elif 'calculation' in attr:
                expr = build_calculation_expression(attr, source_table_name)
            else:
                if 'source_column' in attr:
                    source_column = attr['source_column']
                    if isinstance(source_column, list):
                        expr = f"{source_table_name}.{source_column[0]}"  # Use first column as fallback
                    else:
                        expr = f"{source_table_name}.{source_column}"
                else:
                    expr = "NULL"
        else:
            # This entity doesn't have this attribute - use NULL
            if attr_type == 'S':
                expr = "NULL"
            elif attr_type == 'N':
                expr = "NULL"
            elif attr_type == 'L':
                expr = "NULL"
            elif attr_type == 'BOOL':
                expr = "NULL"
            else:
                expr = "NULL"
        
        # Apply type casting
        if attr_type == 'S':
            cast_expr = f"CAST({expr} AS CHAR)"
        elif attr_type == 'N':
            cast_expr = f"CAST({expr} AS DECIMAL(38,10))"
        elif attr_type == 'L':
            cast_expr = f"CAST({expr} AS JSON)"
        elif attr_type == 'BOOL':
            cast_expr = f"CAST({expr} AS UNSIGNED)"
        else:
            cast_expr = expr
        
        select_parts.append(f"{cast_expr} AS {attr_name}")
    
    # Build FROM and JOIN clauses
    from_clause = f"FROM {source_table}"
    join_clauses = []
    
    for join_table, join_condition in join_info.items():
        if join_table != source_table:
            join_clauses.append(f"LEFT JOIN {join_table} ON {join_condition}")
    
    # Handle self-joins for categories
    if source_table == 'categories':
        join_clauses.append("LEFT JOIN categories parent_cat ON parent_cat.id = categories.parent_id")
        join_clauses.append("LEFT JOIN categories child_cat ON child_cat.parent_id = categories.id")
    
    sql_parts = [
        "SELECT",
        ",\n    ".join(select_parts),
        from_clause
    ]
    
    if join_clauses:
        sql_parts.extend(join_clauses)
    
    # Check if we need GROUP BY for aggregate functions
    has_aggregate = any('JSON_ARRAYAGG' in part for part in select_parts)
    if has_aggregate:
        # Add GROUP BY for non-aggregate columns from the main source table
        group_by_cols = []
        for attr in attributes:
            if 'calculation' not in attr or attr.get('calculation', {}).get('type') != 'aggregate':
                source_column = attr.get('source_column')
                source_table_name = attr.get('source_table', source_table)
                if source_column and source_table_name == source_table:
                    if isinstance(source_column, list):
                        group_by_cols.extend([f"{source_table_name}.{col}" for col in source_column])
                    else:
                        group_by_cols.append(f"{source_table_name}.{source_column}")
        
        # Add joined table columns that are used in SELECT
        for attr in attributes:
            if 'join' in attr and attr['join'].get('type') == 'foreign-key':
                join_config = attr['join']
                select_column = join_config.get('select_column', '')
                if select_column and 'users.email' in select_column:
                    group_by_cols.append(select_column)
        
        if group_by_cols:
            sql_parts.append(f"GROUP BY {', '.join(set(group_by_cols))}")
    
    return "\n".join(sql_parts)

def generate_view_sql(table_config):
    if not table_config:
        return None
    
    table_name = table_config['table']
    table_type = table_config.get('type', 'single-entity')
    
    if table_type == 'multi-entity' and 'entities' in table_config:
        # Generate single view with UNION for all entities
        entities = table_config['entities']
        all_attributes = collect_all_attributes(entities)
        
        entity_sqls = []
        for entity in entities:
            entity_sql = generate_single_entity_sql(entity, table_name, all_attributes)
            if entity_sql:
                entity_sqls.append(entity_sql)
        
        if entity_sqls:
            union_sql = "\nUNION ALL\n".join(entity_sqls)
            return f"CREATE OR REPLACE VIEW ddb_{table_name.lower()}_view AS\n{union_sql};"
        return f"-- No valid entities found for table {table_name}"
    
    elif 'attributes' in table_config:
        # Single entity table
        source_table = table_config.get('source_table', table_name.lower())
        attributes = table_config['attributes']
        
        select_parts = []
        join_info = collect_join_tables(attributes)
        
        for attr in attributes:
            attr_name = attr['name']
            attr_type = attr.get('type', 'S')
            source_table_name = attr.get('source_table', source_table)
            
            # Build the expression
            if 'transformation' in attr:
                expr = build_transformation_expression(attr, source_table_name)
            elif 'join' in attr:
                expr = build_join_expression(attr, source_table_name)
            elif 'calculation' in attr:
                expr = build_calculation_expression(attr, source_table_name)
            else:
                source_column = attr.get('source_column')
                if isinstance(source_column, list):
                    expr = f"{source_table_name}.{source_column[0]}"  # Use first column as fallback
                else:
                    expr = f"{source_table_name}.{source_column}"
            
            # Apply type casting
            if attr_type == 'S':
                cast_expr = f"CAST({expr} AS CHAR)"
            elif attr_type == 'N':
                cast_expr = f"CAST({expr} AS DECIMAL(38,10))"
            elif attr_type == 'BOOL':
                cast_expr = f"CAST({expr} AS UNSIGNED)"
            else:
                cast_expr = expr
            
            select_parts.append(f"{cast_expr} AS {attr_name}")
        
        # Build FROM and JOIN clauses
        from_clause = f"FROM {source_table}"
        join_clauses = []
        
        for join_table, join_condition in join_info.items():
            if join_table != source_table:
                # Handle table aliases (e.g., "categories parent_categories")
                if ' ' in join_table:
                    join_clauses.append(f"LEFT JOIN {join_table} ON {join_condition}")
                else:
                    join_clauses.append(f"LEFT JOIN {join_table} ON {join_condition}")
        
        # All joins are now handled generically through collect_join_tables
        
        sql_parts = [
            f"CREATE OR REPLACE VIEW ddb_{table_name.lower()}_view AS",
            "SELECT",
            ",\n    ".join(select_parts),
            from_clause
        ]
        
        if join_clauses:
            sql_parts.extend(join_clauses)
        
        return "\n".join(sql_parts) + ";"
    
    return f"-- No processable structure found for table {table_name}"

def main():
    parser = argparse.ArgumentParser(description='Generate MySQL views for DynamoDB migration')
    parser.add_argument('--contract', '-c', required=True, help='Path to the migration contract JSON file')
    parser.add_argument('--table', '-t', help='Name of the DynamoDB table to generate view for')
    parser.add_argument('--output', '-o', help='Output SQL file path (if not specified, prints to stdout)')
    parser.add_argument('--all', '-a', action='store_true', help='Generate views for all tables')

    args = parser.parse_args()
    
    if not args.all and not args.table:
        parser.error("either --table or --all is required")
    
    try:
        contract = load_contract(args.contract)
        sql_statements = []
        
        # Add header comment
        table_count = len(contract if isinstance(contract, list) else contract.get('tables', []))
        header = [
            "-- MySQL Views for DynamoDB Migration",
            "-- Generated from migration contract with join patterns",
            f"-- Creates {table_count} views (one per DynamoDB table)",
            "-- Multi-entity tables use UNION ALL to combine entities",
            "-- WARNING: Complex join patterns may require manual review",
            ""
        ]
        sql_statements.extend(header)

        if args.all:
            # Generate SQL for all DynamoDB tables (one view per table)
            tables = contract if isinstance(contract, list) else contract.get('tables', [])
            for table in tables:
                table_name = table.get('table')
                sql = generate_view_sql(table)
                if sql and not sql.startswith('--'):
                    sql_statements.append(f"-- View for DynamoDB table: {table_name}")
                    sql_statements.append(sql)
        else:
            # Generate SQL for specific DynamoDB table
            table_config = get_table_config(contract, args.table)
            if not table_config:
                print(f"Error: DynamoDB table {args.table} not found in contract")
                return 1
            sql = generate_view_sql(table_config)
            if sql and not sql.startswith('--'):
                sql_statements.append(f"-- View for DynamoDB table: {args.table}")
                sql_statements.append(sql)
        
        # Combine all SQL statements
        final_sql = "\n\n".join(sql_statements)
        
        # Output handling
        if args.output:
            with open(args.output, 'w') as f:
                f.write(final_sql)
            print(f"SQL written to {args.output}")
        else:
            print(final_sql)
        
        return 0
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())