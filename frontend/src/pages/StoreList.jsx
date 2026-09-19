import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { Search, MapPin, Store as StoreIcon, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [searchInputs, setSearchInputs] = useState({ name: '', address: '' });
  const [activeFilters, setActiveFilters] = useState({ name: '', address: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ratings, setRatings] = useState({});
  const [reviews, setReviews] = useState({});
  const [hoverRatings, setHoverRatings] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const LIMIT = 10;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchStores = async () => {
    try {
      const params = new URLSearchParams({ ...activeFilters, page, limit: LIMIT }).toString();
      const res = await api.get(`/api/stores?${params}`);

      if (res.data?.stores) {
        setStores(res.data.stores);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setStores(Array.isArray(res.data) ? res.data : []);
        setTotalPages(1);
      }

      const currentUserId = user._id || user.id;
      if (currentUserId) {
        const userRatingsRes = await api.get(`/api/ratings/user/${currentUserId}`);
        const initialRatings = {};
        const initialReviews = {};
        userRatingsRes.data.forEach(r => {
          if (r.store?._id) {
            initialRatings[r.store._id] = r.rating;
            initialReviews[r.store._id] = r.review || '';
          }
        });
        setRatings(initialRatings);
        setReviews(initialReviews);
      }
    } catch {
      setStores([]);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [activeFilters, page]);

  const handleChange = (e) => setSearchInputs({ ...searchInputs, [e.target.name]: e.target.value });

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveFilters(searchInputs);
  };

  const handleRatingClick = (storeId, star) => setRatings(prev => ({ ...prev, [storeId]: star }));
  const handleReviewChange = (storeId, text) => setReviews(prev => ({ ...prev, [storeId]: text }));

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const submitRating = async (storeId) => {
    if (!ratings[storeId]) return;
    setSubmitting(storeId);
    try {
      await api.post('/api/ratings', {
        store: storeId,
        rating: ratings[storeId],
        review: reviews[storeId] || '',
      });
      showToast('Rating submitted successfully!');
      fetchStores();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit rating', 'error');
    } finally {
      setSubmitting(null);
    }
  };

  const containerFade = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, staggerChildren: 0.1 } },
  };

  const itemFade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className="pt-16 pb-12 min-h-screen px-6 lg:px-12 text-zinc-100 font-sans"
      initial="hidden"
      animate="show"
      variants={containerFade}
    >
      <Helmet>
        <title>Explore Stores - Rating App</title>
      </Helmet>

      {toast.show && (
        <div
          className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 border backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-red-500/20 border-red-500/30 text-red-200'
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <motion.div variants={itemFade} className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            <StoreIcon className="w-8 h-8 text-zinc-400" /> Explore Stores
          </h1>
          <p className="text-zinc-400 text-sm">Discover and rate the best stores in the community.</p>
        </motion.div>

        <motion.form variants={itemFade} onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              name="name"
              placeholder="Search by store name..."
              value={searchInputs.name}
              onChange={handleChange}
              className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-zinc-600 outline-none transition-all"
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              name="address"
              placeholder="Filter by location..."
              value={searchInputs.address}
              onChange={handleChange}
              className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-zinc-600 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="bg-zinc-200 text-zinc-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-colors shadow-sm whitespace-nowrap"
          >
            Search
          </button>
        </motion.form>

        <div className="space-y-4">
          {stores.length === 0 ? (
            <motion.div
              variants={itemFade}
              className="py-20 text-center border border-zinc-700/50 border-dashed rounded-2xl bg-zinc-800/20"
            >
              <StoreIcon className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No stores found matching your search.</p>
            </motion.div>
          ) : (
            stores.map((store) => (
              <motion.div
                key={store._id}
                variants={itemFade}
                className="bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 shadow-sm hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight mb-1">{store.name}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      {store.address}
                    </div>

                    {/* Overall Rating */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= Math.round(store.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}
                          />
                        ))}
                      </div>
                      {store.averageRating ? (
                        <span className="text-xs font-semibold text-amber-400">
                          {parseFloat(store.averageRating).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">No ratings yet</span>
                      )}
                      {store.totalRatings > 0 && (
                        <span className="text-[10px] text-zinc-500">
                          ({store.totalRatings} {store.totalRatings === 1 ? 'rating' : 'ratings'})
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/stores/${store._id}`}
                    className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg border border-amber-400/20 transition-colors"
                  >
                    View Details
                  </Link>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800">
                  {user?.role === 'owner' ? (
                    <div className="text-xs text-zinc-500 font-medium italic">Store owners cannot rate stores.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold text-zinc-400 tracking-wider">
                            {ratings[store._id] ? 'YOUR RATING' : 'RATE THIS STORE'}
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={18}
                                onClick={() => handleRatingClick(store._id, star)}
                                onMouseEnter={() => setHoverRatings({ ...hoverRatings, [store._id]: star })}
                                onMouseLeave={() => setHoverRatings({ ...hoverRatings, [store._id]: 0 })}
                                className={`cursor-pointer transition-all ${
                                  (hoverRatings[store._id] || ratings[store._id]) >= star
                                    ? 'fill-zinc-300 text-zinc-300 scale-110'
                                    : 'text-zinc-600 hover:text-zinc-500'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => submitRating(store._id)}
                          disabled={!ratings[store._id] || submitting === store._id}
                          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            ratings[store._id] && submitting !== store._id
                              ? 'bg-zinc-200 text-zinc-900 hover:bg-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700/50'
                          }`}
                        >
                          {submitting === store._id ? 'Saving...' : ratings[store._id] ? 'Update' : 'Submit'}
                        </button>
                      </div>

                      {ratings[store._id] > 0 && (
                        <textarea
                          placeholder="Write a review (optional)..."
                          value={reviews[store._id] || ''}
                          onChange={(e) => handleReviewChange(store._id, e.target.value)}
                          maxLength={500}
                          className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-zinc-600 outline-none transition-all resize-none h-20 mt-2"
                        />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <motion.div variants={itemFade} className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                page === 1 ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-sm font-medium text-zinc-400">
              Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                page === totalPages ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default StoreList;
