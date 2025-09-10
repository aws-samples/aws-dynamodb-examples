import React from 'react';

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: number | null;
  onCategorySelect: (categoryId: number | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategorySelect
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<number>>(new Set());

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategory) return 'All Categories';
    
    // Check top-level categories
    const topLevel = categories.find(c => c.id === selectedCategory);
    if (topLevel) return topLevel.name;
    
    // Check child categories
    for (const category of categories) {
      if (category.children) {
        const child = category.children.find(c => c.id === selectedCategory);
        if (child) return `${category.name} > ${child.name}`;
      }
    }
    return 'Unknown Category';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Compact Header - Always Visible */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Category</h3>
            <p className="text-sm text-blue-600 font-medium">{getSelectedCategoryName()}</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Category List */}
      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {/* All Categories Option */}
            <button
              onClick={() => {
                onCategorySelect(null);
                setIsExpanded(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Categories
            </button>

            {/* Category List */}
            {categories.map((category) => (
              <div key={category.id}>
                {/* Parent Category */}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      onCategorySelect(category.id);
                      setIsExpanded(false);
                    }}
                    className={`flex-1 text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                  
                  {/* Expand/Collapse Button for categories with children */}
                  {category.children && category.children.length > 0 && (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors ml-1"
                    >
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedCategories.has(category.id) ? 'rotate-90' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Child Categories */}
                {category.children && category.children.length > 0 && expandedCategories.has(category.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {category.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          onCategorySelect(child.id);
                          setIsExpanded(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          selectedCategory === child.id
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;