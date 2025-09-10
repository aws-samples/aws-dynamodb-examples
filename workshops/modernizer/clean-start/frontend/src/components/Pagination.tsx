import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalItems = 0,
  itemsPerPage = 10
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 border rounded-lg">
      {/* Info */}
      {showInfo && (
        <div className="flex-1 flex justify-between sm:hidden">
          <span className="text-sm text-gray-700">
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
        </div>
      )}

      {showInfo && (
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className={`${showInfo ? 'hidden sm:block' : 'w-full'}`}>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
              currentPage === 1
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Page Numbers */}
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
              currentPage === totalPages
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;