import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast, Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
  const [blogs, setBlogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    content: '', 
    excerpt: '', 
    keywords: [] 
  });
  const [activeTab, setActiveTab] = useState('blogs');
  const [stats, setStats] = useState({ 
    published: 0, 
    draft: 0, 
    published_to_target: 0,
    total: 0 
  });
  const [imageUrls, setImageUrls] = useState([]);
  
  // ✅ Naye state variables
  const [targetUrl, setTargetUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedBlogForPublish, setSelectedBlogForPublish] = useState(null);

  useEffect(() => {
    fetchBlogs();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (blogs.length > 0) {
      const published = blogs.filter(blog => blog.status === 'published').length;
      const draft = blogs.filter(blog => blog.status === 'draft').length;
      const published_to_target = blogs.filter(blog => blog.status === 'published_to_target').length;
      const total = blogs.length;
      setStats({ published, draft, published_to_target, total });
    } else {
      setStats({ published: 0, draft: 0, published_to_target: 0, total: 0 });
    }
  }, [blogs]);

  // Initialize image URLs when settings change
  useEffect(() => {
    if (settings?.keywords) {
      setImageUrls(Array(settings.keywords.length).fill(''));
    }
  }, [settings?.keywords]);

  const fetchBlogs = async () => {
    try {
      const response = await api.get('/api/blogs/all');
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to fetch blogs');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings/get');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    }
  };

  const generateBlogs = async () => {
    // Validation
    if (!targetUrl || !targetUrl.trim()) {
      toast.error('Please provide Target API URL');
      return;
    }

    // Debug: Check what we're sending
    console.log('Current imageUrls:', imageUrls);
    console.log('Current keywords:', settings.keywords);
    console.log('Target URL:', targetUrl);

    // Enhanced validation
    const missingUrls = [];
    const invalidUrls = [];

    settings.keywords?.forEach((keyword, index) => {
      const url = imageUrls[index];
      if (!url || url.trim() === '') {
        missingUrls.push(`"${keyword || `Keyword ${index + 1}`}"`);
      } else {
        try {
          new URL(url.trim());
        } catch (error) {
          invalidUrls.push(`"${keyword || `Keyword ${index + 1}`}"`);
        }
      }
    });

    if (missingUrls.length > 0) {
      toast.error(`Please provide image URLs for: ${missingUrls.join(', ')}`);
      return;
    }

    if (invalidUrls.length > 0) {
      toast.error(`Invalid image URLs for: ${invalidUrls.join(', ')}`);
      return;
    }

    setGenerating(true);
    try {
      // Create the payload with proper data cleaning
      const payload = {
        keywords: settings.keywords.map((keyword, index) => ({
          keyword: keyword.trim(),
          imageUrl: imageUrls[index].trim()
        })),
        targetUrl: targetUrl.trim()
      };

      console.log('Final payload being sent:', payload);

      const response = await api.post('/api/blogs/generate', payload);
      toast.success(response.data.message || 'Blogs generated successfully!');
      fetchBlogs();
      // Clear image URLs after successful generation
      setImageUrls(Array(settings.keywords.length).fill(''));
      setTargetUrl('');
    } catch (error) {
      console.error('Full generation error:', error);
      console.error('Error response data:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          'Unknown error occurred';
      toast.error(`Error generating blogs: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const updateSettings = async () => {
    try {
      await api.put('/api/settings/update', settings);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Error updating settings: ' + (error.response?.data?.error || error.message));
    }
  };

  const updateKeywords = async () => {
    try {
      await api.put('/api/settings/update-keywords', { keywords: settings.keywords });
      toast.success('Keywords updated successfully!');
    } catch (error) {
      toast.error('Error updating keywords: ' + (error.response?.data?.error || error.message));
    }
  };

  const deleteBlog = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        await api.delete(`/api/blogs/${id}`);
        toast.success('Blog deleted successfully!');
        fetchBlogs();
      } catch (error) {
        toast.error('Error deleting blog: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const deleteKeyword = async (index) => {
    if (window.confirm('Are you sure you want to delete this keyword?')) {
      try {
        const response = await api.delete(`/api/settings/delete-keyword/${index}`);
        setSettings({ ...settings, keywords: response.data.keywords });
        
        // Remove the corresponding image URL
        const newImageUrls = [...imageUrls];
        newImageUrls.splice(index, 1);
        setImageUrls(newImageUrls);
        
        toast.success('Keyword deleted successfully!');
      } catch (error) {
        toast.error('Error deleting keyword: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const publishNow = async (id) => {
    try {
      await api.post(`/api/blogs/${id}/publish`);
      toast.success('Blog published immediately!');
      fetchBlogs();
    } catch (error) {
      toast.error('Error publishing blog: ' + (error.response?.data?.error || error.message));
    }
  };

  const publishToTarget = async (blogId) => {
    setPublishing(true);
    try {
      const response = await api.post(`/api/blogs/${blogId}/publish-to-target`);
      toast.success('Blog successfully published to target website!');
      fetchBlogs();
      setShowPublishModal(false);
    } catch (error) {
      console.error('Publish error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          'Failed to publish blog';
      toast.error(`Publish failed: ${errorMessage}`);
    } finally {
      setPublishing(false);
    }
  };

  const startEditing = (blog) => {
    setEditingBlog(blog);
    setEditForm({ 
      title: blog.title, 
      content: blog.content,
      excerpt: blog.excerpt || '',
      keywords: blog.keywords || []
    });
  };

  const saveEdit = async () => {
    try {
      await api.put(`/api/blogs/${editingBlog._id}`, editForm);
      setEditingBlog(null);
      toast.success('Blog updated successfully!');
      fetchBlogs();
    } catch (error) {
      toast.error('Error updating blog: ' + (error.response?.data?.error || error.message));
    }
  };

  const addKeyword = () => {
    const newKeywords = [...(settings.keywords || []), ''];
    setSettings({
      ...settings,
      keywords: newKeywords
    });
    // Add empty image URL for new keyword
    setImageUrls([...imageUrls, '']);
  };

  const updateImageUrl = (index, url) => {
    const newImageUrls = [...imageUrls];
    newImageUrls[index] = url;
    setImageUrls(newImageUrls);
  };

  const updateKeyword = (index, value) => {
    const newKeywords = [...settings.keywords];
    newKeywords[index] = value;
    setSettings({ ...settings, keywords: newKeywords });
  };

  if (!settings)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-700 font-medium text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: {
            style: {
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
            },
            iconTheme: {
              primary: '#16a34a',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            },
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className='ml-30 text-2xl font-bold py-6 text-center'>
        <h1 className='text-gray-800 font-bold text-2xl'>Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-50 text-green-500 mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.published}</div>
                <div className="text-blue-600/70 text-sm font-medium">Published Blogs</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-500 mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{settings.publishingFrequency}m</div>
                <div className="text-blue-600/70 text-sm font-medium">Publishing Frequency</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-500 mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-blue-600/70 text-sm font-medium">Total Blogs</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-500 mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.published_to_target}</div>
                <div className="text-blue-600/70 text-sm font-medium">Published to Target</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-8 px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-sm inline-flex border border-white/50">
            <button
              onClick={() => setActiveTab('blogs')}
              className={`px-8 py-4 rounded-xl font-semibold cursor-pointer text-sm transition-all duration-300 ${activeTab === 'blogs'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform -translate-y-1'
                  : 'text-blue-600/80 hover:text-blue-700 hover:bg-white/50'
                }`}
            >
              📝 Blog Management
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-8 py-4 rounded-xl font-semibold cursor-pointer text-sm transition-all duration-300 ${activeTab === 'settings'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform -translate-y-1'
                  : 'text-blue-600/80 hover:text-blue-700 hover:bg-white/50'
                }`}
            >
              ⚙️ Platform Settings
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            {/* Quick Actions with Image URL Input */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Quick Actions</h2>
                  <p className="text-blue-600/70 text-sm">Generate and manage your blog content</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{settings.keywords?.length || 0} Keywords</div>
                  <div className="text-sm text-blue-600/70">
                    {imageUrls.filter(url => url && url.trim()).length} / {settings.keywords?.length || 0} Image URLs provided
                  </div>
                </div>
              </div>
              
              {/* ✅ TARGET API URL INPUT */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🎯 Target API URL (Aegservice Publishing Endpoint)
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://aegservice.com/api/publish-blog"
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                />
                <p className="text-sm text-blue-600/70 mt-2">
                  ℹ️ Enter the Aegservice API endpoint where blogs should be published
                </p>
              </div>
              
              {/* Image URLs Input for each keyword */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📷 Image URLs for Each Keyword (Required for Blog Generation)
                </label>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {settings.keywords?.map((keyword, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-blue-50/30 rounded-xl border border-blue-100">
                      <div className="w-1/4">
                        <div className="text-sm font-semibold text-blue-700 mb-1">Keyword {index + 1}</div>
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => updateKeyword(index, e.target.value)}
                          placeholder={`Enter keyword ${index + 1}`}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Image URL for "{keyword || `Keyword ${index + 1}`}"
                        </label>
                        <input
                          type="url"
                          value={imageUrls[index] || ''}
                          onChange={(e) => updateImageUrl(index, e.target.value)}
                          placeholder={`https://example.com/image-for-${keyword || `keyword-${index + 1}`}.jpg`}
                          className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        />
                      </div>
                      <div className="w-20 text-center">
                        {imageUrls[index] && imageUrls[index].trim() ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✅ Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            ⏳ Waiting
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-blue-600/70 mt-2">
                  ℹ️ You must provide an image URL for each keyword. Each blog will use the corresponding image.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={generateBlogs}
                  disabled={generating || imageUrls.some(url => !url || !url.trim()) || !targetUrl.trim()}
                  className={`inline-flex items-center px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${generating || imageUrls.some(url => !url || !url.trim()) || !targetUrl.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transform hover:-translate-y-1 hover:shadow-xl'
                    }`}
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating {settings.keywords?.length || 0} Blogs...
                    </>
                  ) : (
                    `🚀 Generate ${settings.keywords?.length || 0} Blogs`
                  )}
                </button>
              </div>
            </div>

            {/* Blogs Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-blue-50 bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                <h2 className="text-xl font-bold text-gray-800">All Blog Posts</h2>
                <p className="text-blue-600/70 text-sm">Manage and edit your blog content</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100/50">
                  <thead className="bg-blue-50/30">
                    <tr>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Target URL
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/30 divide-y divide-blue-100/30">
                    {blogs.map((blog) => (
                      <tr key={blog._id} className="hover:bg-blue-50/20 transition-all duration-200">
                        <td className="px-8 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-800 max-w-md truncate">
                            {blog.title}
                          </div>
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              blog.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : blog.status === 'published_to_target'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {blog.status === 'published' 
                              ? '✅ Published' 
                              : blog.status === 'published_to_target'
                              ? '🚀 Published to Target'
                              : '📝 Draft'
                            }
                          </span>
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-600/80 font-medium max-w-xs truncate">
                            {blog.targetUrl || 'Not set'}
                          </div>
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap text-sm text-blue-600/80 font-medium">
                          {new Date(blog.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-8 py-4 whitespace-nowrap text-sm font-semibold space-x-3">
                          <button
                            onClick={() => startEditing(blog)}
                            className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                          >
                            ✏️ Edit
                          </button>
                          {blog.status === 'draft' && (
                            <button
                              onClick={() => {
                                setSelectedBlogForPublish(blog);
                                setShowPublishModal(true);
                              }}
                              className="text-green-500 hover:text-green-700 transition-colors duration-200"
                            >
                              🚀 Publish
                            </button>
                          )}
                          {blog.status === 'published' && (
                            <button
                              onClick={() => publishNow(blog._id)}
                              className="text-orange-500 hover:text-orange-700 transition-colors duration-200"
                            >
                              🔄 Republish
                            </button>
                          )}
                          <button
                            onClick={() => deleteBlog(blog._id)}
                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {blogs.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-blue-300 text-6xl mb-4">📝</div>
                  <div className="text-blue-600/70 font-semibold mb-2">No blogs found</div>
                  <div className="text-blue-500/60 text-sm">Generate your first blog to get started</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Platform Settings */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
              <div className="flex items-center mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-500 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Platform Settings</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Publishing Frequency (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.publishingFrequency}
                    onChange={(e) =>
                      setSettings({ ...settings, publishingFrequency: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50"
                  />
                </div>

                <button
                  onClick={updateSettings}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-cyan-600 transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  💾 Save All Settings
                </button>
              </div>
            </div>

            {/* Keywords Management */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-500 mr-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Keywords Management</h2>
                </div>
                <button
                  onClick={addKeyword}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                >
                  + Add Keyword
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                {settings.keywords?.map((keyword, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-white/50 rounded-xl p-3 border border-blue-100">
                    <div className="flex-1">
                      <input
                        value={keyword}
                        onChange={(e) => updateKeyword(index, e.target.value)}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-transparent"
                        placeholder="Enter keyword or topic"
                      />
                    </div>
                    <button
                      onClick={() => deleteKeyword(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={updateKeywords}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-green-600 hover:to-emerald-600 transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                🔑 Update Keywords Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBlog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/50">
            <div className="px-8 py-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h3 className="text-xl font-bold text-gray-800">Edit Blog Post</h3>
              <p className="text-blue-600/70 text-sm">Make changes to your blog content</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Excerpt</label>
                  <textarea
                    rows="3"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    value={editForm.excerpt}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                    placeholder="Brief description of the blog..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Keywords (comma separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={editForm.keywords.join(', ')}
                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value.split(',').map(k => k.trim()) })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Content</label>
                  <textarea
                    rows="15"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-blue-100 bg-blue-50/30">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setEditingBlog(null)}
                  className="px-6 py-3 border border-blue-200 rounded-xl text-blue-600 font-semibold hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-cyan-600 transform hover:-translate-y-1 transition-all duration-300"
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Publish Confirmation Modal */}
      {showPublishModal && selectedBlogForPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-white/50">
            <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-bold text-gray-800">Publish Blog</h3>
              <p className="text-green-600/70 text-sm">Publish this blog to target website</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2"><strong>Title:</strong> {selectedBlogForPublish.title}</p>
                <p className="text-gray-700 mb-2"><strong>Target:</strong> {selectedBlogForPublish.targetUrl}</p>
                <p className="text-sm text-gray-600">Are you sure you want to publish this blog to the target website?</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={publishing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => publishToTarget(selectedBlogForPublish._id)}
                  disabled={publishing}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                >
                  {publishing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Publishing...
                    </>
                  ) : (
                    '🚀 Publish Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;