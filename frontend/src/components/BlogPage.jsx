import React, { useState, useEffect, useCallback } from 'react';
import api from '../axiosConfig';

// Custom CSS to hide scrollbars and the specific h1 tag
const customStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .hidden-heading {
    display: none !important;
  }
`;

// Component Architecture
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50   flex justify-center items-center">
    <style>{customStyles}</style>
    <div className="text-center">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 border-t-blue-500 mx-auto mb-4"></div>
      <p className="text-blue-700 font-medium text-lg">Loading Articles...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-3">No Articles Yet</h3>
    <p className="text-blue-600/70 text-lg max-w-md mx-auto">
      New articles will be available soon. Stay tuned!
    </p>
  </div>
);

const StatsBar = ({ blogCount }) => (
  <div className="flex justify-center gap-4 mb-8">
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-white/50">
      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-sm font-semibold text-gray-700">
        {blogCount} {blogCount === 1 ? 'Article' : 'Articles'} Published
      </span>
    </div>
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-white/50">
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      <span className="text-sm font-semibold text-gray-700">
        Live Updates
      </span>
    </div>
  </div>
);

const BlogCard = ({ blog, readingTime, onCardClick }) => {
  const formatContent = (content, wordLimit = 25) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/);
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return text;
  };

  const getWordCount = (content) => {
    return content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  };

  const wordCount = getWordCount(blog.content);
  const readTime = readingTime[blog._id] || Math.ceil(wordCount / 200);

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group"
      onClick={() => onCardClick(blog)}
    >
      {/* Blog Image */}
      {blog.image && (
        <div className="w-full h-72 overflow-hidden">
          <img 
            src={blog.image} 
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Card Content */}
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 text-sm font-semibold border border-blue-100">
              {Array.isArray(blog.keywords) ? blog.keywords[0] : "Tech"}
            </span>
           
          </div>
          <span className="text-sm text-blue-600/60 font-medium bg-blue-50/50 px-3 py-1.5 rounded-xl">
            {new Date(blog.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric"
            })}
          </span>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 line-clamp-2  transition-colors mb-4 leading-tight">
          {blog.title}
        </h2>

        {/* Content Preview */}
        <p className="text-gray-700 font-semibold text-base leading-relaxed line-clamp-3 mb-6">
          {formatContent(blog.content, 25)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-blue-100/50">
          
          <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
            <span>Read more</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const BlogModal = ({ blog, readingTime, onClose }) => {
  const getWordCount = (content) => {
    return content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  };

  // Function to hide specific h1 tags in the content
  const processContent = (content) => {
    return content.replace(/<h1[^>]*>.*?<\/h1>/gi, '<h1 class="hidden-heading">$&</h1>');
  };

  return (
    <div 
      className="fixed inset-0 bg-white flex  items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-8xl py-8 pt-20 w-full max-h-[90vh] overflow-hidden flex flex-col "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - NO IMAGE */}
        <div className="px-8 py-6 border-b border-blue-100  bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white text-blue-600 text-sm font-semibold border border-blue-200">
                  {Array.isArray(blog.keywords) ? blog.keywords[0] : "Article"}
                </span>
                <div className="flex items-center gap-4 text-sm text-blue-600/80 font-medium">
                  <span className="flex items-center bg-white/80 px-3 py-1.5 rounded-xl">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(blog.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center bg-white/80 px-3 py-1.5 rounded-xl">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {readingTime[blog._id] || 5} min read
                  </span>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 leading-tight mb-4">
                {blog.title}
              </h2>

              {blog.excerpt && (
                <div className="bg-white/80 border-l-4 border-blue-400 p-4 rounded-xl">
                  <p className="text-blue-600/80 text-base leading-relaxed font-medium">
                    {blog.excerpt}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-6 p-3 hover:bg-white/80 rounded-xl transition-all duration-200 flex-shrink-0 border border-white/50"
            >
              <svg className="w-6 h-6 text-blue-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-white">
          <div
            className="prose prose-lg max-w-none 
                      prose-headings:text-gray-800 prose-headings:font-bold
                      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-base
                      prose-li:text-gray-700 
                      prose-strong:text-gray-800 
                      prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50/50 prose-blockquote:italic prose-blockquote:rounded-xl
                      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                      prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto prose-img:max-w-full"
            dangerouslySetInnerHTML={{ 
              __html: processContent(blog.content) 
            }}
          />
        </div>

      
      </div>
    </div>
  );
};

// Main Component
const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [readingTime, setReadingTime] = useState({});

  // Memoized functions for better performance
  const calculateReadingTimes = useCallback((blogsList) => {
    const times = {};
    blogsList.forEach(blog => {
      const wordCount = blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      const readingTimeMinutes = Math.ceil(wordCount / 200);
      times[blog._id] = readingTimeMinutes;
    });
    setReadingTime(times);
  }, []);

  const fetchPublishedBlogs = useCallback(async () => {
    try {
      const response = await api.get('/api/blogs/published');
      setBlogs(response.data);
      calculateReadingTimes(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateReadingTimes]);

  useEffect(() => {
    fetchPublishedBlogs();
    const interval = setInterval(fetchPublishedBlogs, 30000);
    return () => clearInterval(interval);
  }, [fetchPublishedBlogs]);

  const openModal = useCallback((blog) => {
    setSelectedBlog(blog);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setSelectedBlog(null);
    document.body.style.overflow = 'auto';
  }, []);

  // Keyboard event for modal close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedBlog) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBlog, closeModal]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="min-h-screen  bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      
        <header className="bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl pt-20 font-bold bg-gradient-to-r from-pink-600 to-cyan-300 bg-clip-text text-transparent mb-6">
                Discover Quality Content
              </h1>
              <p className="text-gray-600/80 text-xl max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
           Handpicked articles offering in-depth knowledge, fresh ideas, and meaningful insights across a wide range of topics to keep you informed and inspired.
              </p>
              
            </div>
          </div>
        </header>

        {/* Blog Cards Grid */}
        <main className="max-w-7xl mx-auto py-8 px-6">
          {blogs.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Grid Layout - 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {blogs.map((blog) => (
                  <BlogCard
                    key={blog._id}
                    blog={blog}
                    readingTime={readingTime}
                    onCardClick={openModal}
                  />
                ))}
              </div>

            
            </>
          )}
        </main>

        {/* Blog Detail Modal */}
        {selectedBlog && (
          <BlogModal
            blog={selectedBlog}
            readingTime={readingTime}
            onClose={closeModal}
          />
        )}
      </div>
    </>
  );
};

export default BlogPage;