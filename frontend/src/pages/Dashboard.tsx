import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodoStore, type Todo } from '../store/todoStore';
import { useAuthStore } from '../store/authStore';
import TodoItem from '../components/TodoItem';
import apiClient from '../api/client';
import ReactMarkdown from 'react-markdown';
import { Plus, Crown, LayoutDashboard, ShieldCheck, Copy, Globe, Check, Mail } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { todos, fetchTodos, addTodo, updateTodo, deleteTodo, isLoading } = useTodoStore();
  const { user, isPremium, setPremium } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [scrapedData, setScrapedData] = useState<{title: string, url: string, content: string} | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeError, setScrapeError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [newTodo, setNewTodo] = useState<Partial<Todo>>({
    title: '',
    description: '',
    priority: 'Low',
    dueDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const { data } = await apiClient.get('payment/status');
        setPremium(data.premium);
      } catch (err) {
        console.error('Failed to fetch premium status', err);
      }
    };
    checkPremiumStatus();
  }, [setPremium]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title) return;
    await addTodo(newTodo);
    setNewTodo({ title: '', description: '', priority: 'Low', dueDate: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  const loadSuggestions = async () => {
    setSuggestions([]);
    setScrapedData(null);
    setScrapeError('');
    setLoadingSuggestions(true);
    try {
      const url = scrapeUrl ? `scrape?url=${encodeURIComponent(scrapeUrl)}` : 'scrape';
      const { data } = await apiClient.get(url);
      console.log('[DEBUG] Scrape Response:', data);
      
      if (data.content) {
        setScrapedData({
          title: data.title || 'Untitled Page',
          url: data.url || scrapeUrl,
          content: String(data.content || '')
        });
      }

      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions.filter((s: any) => typeof s === 'string'));
      } else if (!data.content) {
        setScrapeError('No content found on this page.');
      }
    } catch (err: any) {
      console.error('Failed to load suggestions', err);
      const msg = err.response?.data?.error || 'Server error: Could not connect to extractor.';
      setScrapeError(msg);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadEmailSuggestions = async () => {
    setSuggestions([]);
    setScrapedData(null);
    setEmailError('');
    setLoadingEmails(true);
    try {
      const { data } = await apiClient.get('scrape/email');
      const allSuggestions: string[] = [];
      data.emails.forEach((email: any) => {
        allSuggestions.push(...email.suggestions);
      });
      setSuggestions(allSuggestions);
      if (allSuggestions.length === 0) {
        setEmailError('No actionable tasks found in your latest emails.');
      }
    } catch (err: any) {
      console.error('Failed to load email suggestions', err);
      setEmailError(err.response?.data?.error || 'Failed to connect to email server.');
    } finally {
      setLoadingEmails(false);
    }
  };

  const copyToClipboard = () => {
    if (scrapedData?.content) {
      navigator.clipboard.writeText(scrapedData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpgrade = async () => {
    try {
      console.log('[PAYMENT] Initiating upgrade...');
      const { data: orderData } = await apiClient.post('payment/order');
      console.log('[PAYMENT] Order created successfully:', orderData);
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Todo App Premium',
        description: 'Upgrade to Premium for unlimited tasks and advanced features',
        order_id: orderData.orderId,
        handler: async (response: any) => {
          console.log('[PAYMENT] Payment successful, verifying...', response);
          try {
            const { data: verifyData } = await apiClient.post('payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            console.log('[PAYMENT] Verification success:', verifyData);
            alert(verifyData.message);
            setPremium(true);
          } catch (error) {
            console.error('[PAYMENT] Verification failed', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: function() {
            console.log('[PAYMENT] Checkout modal closed by user');
          }
        }
      };

      console.log('[PAYMENT] Opening Razorpay modal...');
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('[PAYMENT] Failed to initiate upgrade', error);
      const msg = error.response?.data?.details || error.message;
      alert(`Failed to initiate payment: ${msg}`);
    }
  };

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6 bg-primary-600 text-white border-none">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-5 h-5 text-primary-200" />
            <h3 className="font-semibold text-primary-100">Total Tasks</h3>
          </div>
          <p className="text-3xl font-bold">{todos.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-slate-500 mb-2">Pending</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{pendingCount}</p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-slate-500 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
        </div>
        {!isPremium && (
          <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-900/50">
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-500 mb-1 flex items-center gap-1">
                <Crown className="w-4 h-4" /> Go Premium
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">Unlock unlimited lists and filters.</p>
            </div>
            <button 
              onClick={handleUpgrade}
              className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors w-full"
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>

      {/* MFA Banner */}
      {!user?.mfaEnabled && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-dark-800 p-2 rounded-lg shadow-sm">
              <ShieldCheck className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h4 className="font-bold">Enhance your security</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enable Multi-Factor Authentication to protect your account.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/mfa-setup')}
            className="btn-primary py-2 px-6 whitespace-nowrap"
          >
            Enable MFA Now
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Tasks</h2>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2 py-2 px-4"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddTodo} className="card p-5 space-y-4 animate-slide-up border-primary-200 dark:border-primary-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input 
                    type="text" 
                    value={newTodo.title}
                    onChange={e => setNewTodo({...newTodo, title: e.target.value})}
                    className="input-field font-medium text-lg"
                    placeholder="What needs to be done?"
                    autoFocus
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                    Description <span className="text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded">AES-256 Encrypted</span>
                  </label>
                  <textarea 
                    value={newTodo.description}
                    onChange={e => setNewTodo({...newTodo, description: e.target.value})}
                    className="input-field min-h-[80px]"
                    placeholder="Add details..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newTodo.dueDate}
                    onChange={e => setNewTodo({...newTodo, dueDate: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select 
                    value={newTodo.priority}
                    onChange={e => setNewTodo({...newTodo, priority: e.target.value as any})}
                    className="input-field"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" className="btn-primary">Save Task</button>
                </div>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading tasks...</div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12 card border-dashed">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">No tasks yet</h3>
              <p className="text-slate-500 mb-4">Get started by creating a new task or importing suggestions.</p>
              <button onClick={() => setShowForm(true)} className="text-primary-600 font-medium hover:underline">Create your first task</button>
            </div>
          ) : (
            <div className="space-y-3">
              {todos.map(todo => (
                <TodoItem 
                  key={todo.id} 
                  todo={todo} 
                  onUpdate={updateTodo} 
                  onDelete={deleteTodo} 
                />
              ))}
            </div>
          )}

          {/* Web Scraper Markdown View */}
          {scrapedData && (
            <div className="card p-0 overflow-hidden border-primary-200 dark:border-primary-900/50 animate-slide-up">
              <div className="bg-slate-50 dark:bg-dark-800 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {scrapedData.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[300px]">{scrapedData.url}</p>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-6 bg-dark-900 text-slate-300 font-mono text-sm max-h-[500px] overflow-y-auto custom-scrollbar markdown-body">
                <ReactMarkdown>
                  {scrapedData.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 space-y-6">
          <div className="card p-5 bg-slate-900 text-white border-none shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary-400" /> 
                Web Scraper
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="Paste URL to scrape..."
                  className="w-full bg-slate-800 border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
                <button 
                  onClick={loadSuggestions}
                  disabled={loadingSuggestions}
                  className="absolute right-2 top-1.5 bottom-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-4 rounded-md text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  {loadingSuggestions ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Globe className="w-3 h-3" />
                      Scrape
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              <button 
                onClick={loadEmailSuggestions}
                disabled={loadingEmails}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-all"
              >
                {loadingEmails ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-primary-400" />
                    Fetch tasks from Email
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 italic text-center">Extracts action items from your latest unread emails.</p>
            </div>
            
            {scrapeError && (
              <div className="text-xs text-red-400 mt-4 p-2 bg-red-900/20 rounded border border-red-900/30">
                {scrapeError}
              </div>
            )}
            {emailError && (
              <div className="text-xs text-amber-400 mt-4 p-2 bg-amber-900/20 rounded border border-amber-900/30">
                {emailError}
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-500" /> Quick Tasks
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs p-2 bg-slate-50 dark:bg-dark-900/50 rounded flex items-start gap-2 group border border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => {
                        setNewTodo({ title: suggestion, description: '', priority: 'Low', dueDate: new Date().toISOString().split('T')[0] });
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-primary-500 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Add to tasks"
                    >
                      <Plus className="w-3 h-3 mt-0.5" />
                    </button>
                    <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Diagnostics */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={async () => {
                try {
                  const { data } = await apiClient.get('payment/status');
                  alert(`Connected! User: ${user?.email}\nPremium: ${data.premium ? 'Yes' : 'No'}`);
                } catch (err: any) {
                  alert(`Connection Error: ${err.response?.status || 'Offline'}`);
                }
              }}
              className="w-full py-2 px-4 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-3 h-3" />
              Check Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
