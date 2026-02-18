import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const MAX_CHARS = 5000;
const parseQuestions = (text) => text.split('\n').filter(q => q.trim());

const copyText = async (text, onSuccess) => {
  try { await navigator.clipboard.writeText(text); onSuccess(); }
  catch (err) { console.error('Copy failed:', err); }
};

const exportToFile = (answers) => {
  const content = answers
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join('\n\n---\n\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'ai-answers.txt' });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ─── Chat Modal ───────────────────────────────────────────────────────────────
function ChatModal({ item, onClose, theme }) {
  const [chatMessages, setChatMessages] = useState([{
    role: 'assistant',
    content: `Hi! I can answer follow-up questions about:\n\n**Q:** ${item.question}\n**A:** ${item.answer}\n\nWhat would you like to know more about?`,
    timestamp: Date.now()
  }]);
  const [input, setInput]             = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError]     = useState('');
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const sendMessage = async () => {
    const userMsg = input.trim();
    if (!userMsg || chatLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setInput(''); setChatLoading(true); setChatError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/chat`, {
        originalQuestion: item.question,
        originalAnswer: item.answer,
        history: chatMessages.slice(1).map(m => ({ role: m.role, content: m.content })),
        userMessage: userMsg
      });
      if (res.data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, timestamp: Date.now() }]);
      } else { setChatError('Failed to get response. Please try again.'); }
    } catch (err) {
      console.error('Chat error:', err);
      setChatError('Error connecting to server.');
    } finally { setChatLoading(false); inputRef.current?.focus(); }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`chat-modal ${theme}`}>
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            <span className="chat-icon">💬</span>
            <div>
              <div className="chat-title-text">Chat about this answer</div>
              <div className="chat-subtitle" title={item.question}>
                {item.question.length > 60 ? item.question.slice(0, 60) + '…' : item.question}
              </div>
            </div>
          </div>
          <button className="chat-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div className="chat-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chat-bubble-wrap ${msg.role}`}>
              <div className={`chat-bubble ${msg.role}`}>
                <div className="chat-bubble-text" dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br />')
                }} />
                <div className="chat-bubble-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="chat-bubble-wrap assistant">
              <div className="chat-bubble assistant typing">
                <div className="typing-dots"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          {chatError && <div className="chat-error-msg">⚠️ {chatError}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask a follow-up… (Enter to send, Shift+Enter for newline)"
              rows={2} className="chat-input" disabled={chatLoading}
            />
            <button onClick={sendMessage} disabled={chatLoading || !input.trim()} className="chat-send-btn">
              {chatLoading ? <span className="loading-spinner"></span> : '➤'}
            </button>
          </div>
          <div className="chat-input-hint">Enter to send • Shift+Enter for new line • Esc to close</div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [questions, setQuestions] = useState('');
  const [theme, setTheme]         = useState('light');
  const [showStats, setShowStats] = useState(false);

  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState('');
  const [answers, setAnswers]                       = useState([]);        // { question, answer, error, index, streaming }
  const [progress, setProgress]                     = useState(0);
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(-1);

  const [copiedIndex, setCopiedIndex]       = useState(null);
  const [summaries, setSummaries]           = useState({});
  const [showSummary, setShowSummary]       = useState({});
  const [summarizingIdx, setSummarizingIdx] = useState(null);
  const [chatItem, setChatItem]             = useState(null);

  const qCount = parseQuestions(questions).length;

  // ─── Submit with streaming token handling ──────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const qArray = parseQuestions(questions);
    if (!qArray.length) return setError('Please enter at least one question');

    setLoading(true); setError(''); setAnswers([]);
    setCurrentAnswerIndex(-1); setProgress(0); setCopiedIndex(null);

    try {
      const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${BACKEND}/api/ask-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: qArray })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              // Initialize an empty streaming answer card
              setProgress((data.current / data.total) * 100);
              setAnswers(prev => {
                const next = [...prev];
                next[data.index] = { question: data.question, answer: '', error: false, index: data.index, streaming: true };
                return next;
              });
              setCurrentAnswerIndex(data.index);

            } else if (data.type === 'token') {
              // Append each token to the answer text in real-time
              setAnswers(prev => {
                const next = [...prev];
                if (next[data.index]) {
                  next[data.index] = { ...next[data.index], answer: next[data.index].answer + data.chunk };
                }
                return next;
              });

            } else if (data.type === 'answer_done') {
              // Mark streaming finished for this card
              setAnswers(prev => {
                const next = [...prev];
                next[data.index] = { ...data, streaming: false };
                return next;
              });
              setProgress(((data.index + 1) / qArray.length) * 100);

            } else if (data.type === 'error') {
              setError(data.error);
            }
          } catch { /* skip bad lines */ }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process questions. Please try again.');
    } finally {
      setLoading(false); setProgress(100);
    }
  }, [questions]);

  const handleClear = () => {
    setQuestions(''); setAnswers([]); setError('');
    setCurrentAnswerIndex(-1); setProgress(0); setCopiedIndex(null);
    setSummaries({}); setShowSummary({}); setSummarizingIdx(null); setChatItem(null);
  };

  const handleCopy = (text, index) => {
    copyText(text, () => { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); });
  };

  const handleSummarize = async (index) => {
    const item = answers[index];
    if (!item || item.error || item.streaming) return;
    if (summaries[index]) return setShowSummary(prev => ({ ...prev, [index]: !prev[index] }));
    setSummarizingIdx(index);
    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/summarize-answer`, { question: item.question, answer: item.answer });
      if (res.data.success) {
        setSummaries(prev => ({ ...prev, [index]: res.data.summary }));
        setShowSummary(prev => ({ ...prev, [index]: true }));
      }
    } catch (err) { console.error('Summarize error:', err); }
    finally { setSummarizingIdx(null); }
  };

  return (
    <div className={`App ${theme}`}>
      <div className="app-background"><div className="background-pattern"></div></div>

      {chatItem && <ChatModal item={chatItem} theme={theme} onClose={() => setChatItem(null)} />}

      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon"></div>
          <span className="brand-text">AI Multi-Question</span>
        </div>
        <div className="nav-actions">
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {answers.length > 0 && (
            <button className="export-button" onClick={() => exportToFile(answers)}>📥 Export</button>
          )}
        </div>
      </nav>

      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1 className="main-title"><span className="title-gradient">AI Multi-Question App</span></h1>
            <p className="subtitle">Ask multiple questions at once and get AI-powered answers</p>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-number">{qCount}</span>
                <span className="stat-label">Questions</span>
              </div>
              {answers.length > 0 && (
                <>
                  <div className="stat-divider">•</div>
                  <div className="stat-item">
                    <span className="stat-number">{answers.filter(a => !a?.error).length}</span>
                    <span className="stat-label">Answers</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="main">
          <div className="content-grid">
            <div className="question-section">
              <div className="section-header">
                <h2 className="section-title"><span className="title-icon">❓</span> Ask Questions</h2>
                <button className="stats-toggle" onClick={() => setShowStats(s => !s)}>
                  📊 {showStats ? 'Hide' : 'Show'} Stats
                </button>
              </div>

              {showStats && (
                <div className="stats-panel">
                  <div className="stat-row"><span>Characters:</span><span>{questions.length}</span></div>
                  <div className="stat-row"><span>Words:</span><span>{questions.split(/\s+/).filter(Boolean).length}</span></div>
                  <div className="stat-row"><span>Lines:</span><span>{questions.split('\n').length}</span></div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="question-form">
                <div className="form-group">
                  <label htmlFor="questions" className="form-label">
                    Enter your questions <span className="label-hint">(one per line)</span>
                  </label>
                  <div className="textarea-wrapper">
                    <textarea
                      id="questions" value={questions}
                      onChange={e => setQuestions(e.target.value.slice(0, MAX_CHARS))}
                      placeholder={`What is the capital of France?\nHow does photosynthesis work?\nWhat are the benefits of meditation?`}
                      rows={10} className="question-textarea" disabled={loading}
                    />
                    <div className="textarea-footer">
                      <div className="question-count">{qCount} question{qCount !== 1 ? 's' : ''}</div>
                      <div className="char-count">{questions.length}/{MAX_CHARS} chars</div>
                    </div>
                  </div>
                </div>

                <div className="button-group">
                  <button type="submit" disabled={loading || !questions.trim() || qCount === 0} className="submit-button">
                    {loading
                      ? <><span className="loading-spinner"></span> Processing {qCount} question{qCount !== 1 ? 's' : ''}...</>
                      : <><span className="button-icon"></span> Get Answers</>}
                  </button>
                  <button type="button" onClick={handleClear} disabled={loading} className="clear-button">
                    <span className="button-icon">🗑️</span> Clear
                  </button>
                </div>
              </form>

              {error && (
                <div className="error-message">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content"><strong>Error:</strong> {error}</div>
                </div>
              )}
            </div>

            {answers.length > 0 && (
              <div className="answers-section">
                <div className="section-header">
                  <h2 className="section-title"><span className="title-icon">💡</span> AI Answers</h2>
                  <div className="progress-info">
                    <span className="progress-text">{Math.round(progress)}% Complete</span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="answers-container">
                  {answers.map((item, index) => item && (
                    <div
                      key={index}
                      className={`answer-card ${index <= currentAnswerIndex ? 'visible' : 'hidden'} ${item.error ? 'error-answer' : ''}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="answer-header">
                        <div className="question-number">Q{index + 1}</div>
                        <div className="answer-actions">
                          {/* Streaming cursor badge */}
                          {item.streaming && (
                            <span className="streaming-badge">⚡ Streaming…</span>
                          )}

                          {!item.error && !item.streaming && (
                            <button
                              onClick={() => handleSummarize(index)}
                              className="summary-button"
                              disabled={summarizingIdx === index}
                              title={summaries[index] ? 'Toggle summary' : 'Generate summary'}
                            >
                              {summarizingIdx === index
                                ? <span className="loading-spinner"></span>
                                : summaries[index] ? (showSummary[index] ? '📄' : '📝') : '🔍'}
                            </button>
                          )}

                          <button onClick={() => handleCopy(item.answer, index)} className="copy-button" title="Copy answer">
                            {copiedIndex === index ? '✅' : '📋'}
                          </button>

                          {!item.error && !item.streaming && (
                            <button onClick={() => setChatItem(item)} className="chat-open-btn" title="Chat about this answer">
                              💬 Chat
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="question-content">{item.question}</div>

                      <div className="answer-content">
                        {summaries[index] && showSummary[index] ? (
                          <div className="summary-section">
                            <div className="summary-label">📝 Short Answer:</div>
                            <div className="summary-text">{summaries[index]}</div>
                            <button onClick={() => setShowSummary(p => ({ ...p, [index]: false }))} className="toggle-summary-btn">
                              Show full answer
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`answer-text ${item.streaming ? 'streaming-text' : ''}`}
                              dangerouslySetInnerHTML={{ __html: item.answer.replace(/\n/g, '<br />') }}
                            />
                            {item.streaming && <span className="streaming-cursor">▋</span>}
                            {summaries[index] && !item.streaming && (
                              <button onClick={() => setShowSummary(p => ({ ...p, [index]: true }))} className="toggle-summary-btn">
                                Show short answer
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {item.error && <div className="error-badge">⚠️ Error occurred</div>}
                    </div>
                  ))}
                </div>

                {loading && (
                  <div className="processing-indicator">
                    <div className="processing-dots"><span></span><span></span><span></span></div>
                    <span>Processing remaining questions…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <div className="footer-info">
              <span className="footer-brand">🤖 AI Multi-Question App</span>
              <span className="footer-divider">•</span>
              <span>Powered by OpenRouter API</span>
            </div>
            <button onClick={() => window.open('https://openrouter.ai', '_blank')} className="footer-link">
              Learn more about OpenRouter
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;