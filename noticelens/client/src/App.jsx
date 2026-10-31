import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Bell, BookOpenCheck, CalendarClock,
  Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, Clock3, CloudUpload,
  FileCheck2, FileText, GraduationCap, ListChecks, LoaderCircle, MessageCircle,
  MessageSquareText, Plus, Search, ShieldCheck, Sparkles, UploadCloud,
  X, Zap,
} from 'lucide-react';

const API_BASE = '';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortDate(value) {
  if (!value) return 'Date not specified';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function getCountdown(dateISO) {
  if (!dateISO) return null;
  const target = new Date(`${dateISO}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  if (diff < 0) return { label: 'Deadline passed', past: true };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { label: days === 1 ? '1 day left' : `${days} days left`, past: false };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function Evidence({ children }) {
  if (!children) return null;
  return <div className="evidence"><span>FROM THE NOTICE</span><p>“{children}”</p></div>;
}

function EmptyState({ onTrySample, onChooseFile }) {
  return (
    <div className="empty-state">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={14} /> YOUR AI NOTICE ASSISTANT</div>
        <h1>Every notice.<br /><span>Crystal clear.</span></h1>
        <p>Drop in a college, scholarship or government notice. NoticeLens turns the fine print into the next steps that matter.</p>
        <div className="hero-actions">
          <button className="button primary large" onClick={onChooseFile}><UploadCloud size={17} /> Upload a notice</button>
          <button className="button secondary large" onClick={onTrySample}>Try sample notice <ArrowRight size={16} /></button>
        </div>
        <div className="trust-row"><ShieldCheck size={15} /> Files are processed for this request and are not saved by NoticeLens.</div>
      </div>
      <div className="upload-card">
        <div className="upload-orbit orbit-one" /><div className="upload-orbit orbit-two" />
        <div className="paper-illustration"><div className="paper-top"><span /><span /><span /></div><div className="paper-emblem"><GraduationCap size={22} /></div><i /><i /><i className="short" /><div className="paper-highlight" /><i /><i className="short" /></div>
        <div className="floating-chip chip-ai"><Sparkles size={14} /> AI-powered reading</div>
        <div className="floating-chip chip-date"><CalendarClock size={14} /> Deadlines found</div>
        <div className="upload-card-caption"><strong>Less scanning. More doing.</strong><span>PDF · JPG · PNG · WEBP · TXT</span></div>
      </div>
      <div className="feature-strip">
        <div><span className="feature-icon blue"><FileSearchIcon /></span><div><strong>Understand</strong><small>Complex language, simplified</small></div></div>
        <div><span className="feature-icon mint"><CalendarClock size={19} /></span><div><strong>Stay ahead</strong><small>Dates and deadlines surfaced</small></div></div>
        <div><span className="feature-icon lilac"><MessageCircle size={19} /></span><div><strong>Ask anything</strong><small>Answers grounded in your notice</small></div></div>
      </div>
    </div>
  );
}

function FileSearchIcon() { return <Search size={19} />; }

function App() {
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [model, setModel] = useState('gemma-4-26b-a4b-it');
  const [serverStatus, setServerStatus] = useState('checking');
  const [configured, setConfigured] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((response) => response.json())
      .then((data) => {
        setServerStatus(data.ok ? 'online' : 'offline');
        setConfigured(Boolean(data.configured));
        setModel(data.model || 'gemma-4-26b-a4b-it');
      })
      .catch(() => setServerStatus('offline'));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isAsking]);

  const actionSteps = useMemo(() => normalizeArray(analysis?.actionSteps), [analysis]);
  const keyPoints = useMemo(() => normalizeArray(analysis?.keyPoints), [analysis]);
  const eligibility = useMemo(() => normalizeArray(analysis?.eligibility), [analysis]);
  const documents = useMemo(() => normalizeArray(analysis?.documentsRequired), [analysis]);
  const importantDates = useMemo(() => normalizeArray(analysis?.importantDates), [analysis]);
  const countdown = getCountdown(analysis?.deadline?.dateISO);
  const completionPercent = actionSteps.length ? Math.round((completedTasks.length / actionSteps.length) * 100) : 0;

  function resetForFile(nextFile) {
    setFile(nextFile);
    setAnalysis(null);
    setCompletedTasks([]);
    setMessages([]);
    setError('');
    setActiveView('overview');
  }

  function handlePickedFile(nextFile) {
    if (!nextFile) return;
    const accepted = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown'];
    if (!accepted.includes(nextFile.type)) {
      setError('That file type is not supported. Choose a PDF, JPG, PNG, WEBP or TXT file.');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError('Your file is larger than 10 MB. Choose a smaller notice.');
      return;
    }
    resetForFile(nextFile);
  }

  async function trySampleNotice() {
    setError('');
    try {
      const response = await fetch('/sample-notice.txt');
      if (!response.ok) throw new Error('The sample notice could not be loaded.');
      const text = await response.text();
      resetForFile(new File([text], 'DTU-Merit-cum-Means-Scholarship-Sample.txt', { type: 'text/plain' }));
      setToast('Sample notice loaded. Analyse it to see NoticeLens in action.');
      window.setTimeout(() => setToast(''), 3500);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function analyze() {
    if (!file) return;
    setIsAnalyzing(true);
    setError('');
    const body = new FormData();
    body.append('notice', file);
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Notice analysis failed.');
      setAnalysis(data.analysis);
      setModel(data.model || model);
      setMessages([{ role: 'assistant', content: `I've analysed **${data.analysis?.title || file.name}**. Ask me anything about its requirements, dates or next steps.`, evidenceQuotes: [], confidence: 'high' }]);
      setActiveView('overview');
    } catch (requestError) {
      setError(requestError.message || 'Could not analyse this notice.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function askQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || !file || isAsking) return;
    setQuestion('');
    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setIsAsking(true);
    setError('');
    const body = new FormData();
    body.append('notice', file);
    body.append('question', trimmed);
    body.append('history', JSON.stringify(messages.slice(-8).map(({ role, content }) => ({ role, content }))));
    try {
      const response = await fetch(`${API_BASE}/api/chat`, { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not answer that question.');
      setMessages((current) => [...current, {
        role: 'assistant',
        content: data.answer || 'I could not find a clear answer in this notice.',
        evidenceQuotes: normalizeArray(data.evidenceQuotes),
        confidence: data.confidence || 'low',
        notInNotice: Boolean(data.notInNotice),
      }]);
    } catch (requestError) {
      setMessages((current) => [...current, { role: 'assistant', content: requestError.message || 'Something went wrong. Please try again.', error: true }]);
    } finally {
      setIsAsking(false);
    }
  }

  function toggleTask(index) {
    setCompletedTasks((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  function showView(view) {
    setActiveView(view);
    if (!analysis && view !== 'overview') setActiveView('overview');
  }

  const fileKind = file?.type === 'application/pdf' ? 'PDF document' : file?.type.startsWith('image/') ? 'Image notice' : 'Text document';

  return (
    <div className="app-shell" onDragOver={(event) => { if (event.dataTransfer?.types?.includes('Files')) { event.preventDefault(); setIsDragging(true); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handlePickedFile(event.dataTransfer.files?.[0]); }}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>N</span><i /></div><div><strong>notice<span>lens</span></strong><small>STUDENT INTELLIGENCE</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className={activeView === 'overview' ? 'active' : ''} onClick={() => showView('overview')}><span><BookOpenCheck size={17} /></span> Overview</button>
          <button className={activeView === 'checklist' ? 'active' : ''} onClick={() => showView('checklist')} disabled={!analysis}><span><ListChecks size={17} /></span> Action checklist {analysis && <b>{Math.max(0, actionSteps.length - completedTasks.length)}</b>}</button>
          <button className={activeView === 'ask' ? 'active' : ''} onClick={() => showView('ask')} disabled={!analysis}><span><MessageSquareText size={17} /></span> Ask your notice</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="gemma-card"><div className="gemma-orb"><Sparkles size={17} /></div><div><strong>Powered by Gemma 4</strong><span>Multimodal notice intelligence</span></div><span className="gemma-dot" /></div>
          <div className="privacy-note"><ShieldCheck size={15} /><span>Not saved by NoticeLens<br /><small>Sent to Google for AI processing.</small></span></div>
          <div className="profile"><div className="avatar">NL</div><div><strong>Your workspace</strong><span>Personal account</span></div><button title="Workspace settings" onClick={() => setToast('Workspace settings are not part of this MVP yet.')}><Plus size={16} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeView === 'overview' ? 'Overview' : activeView === 'checklist' ? 'Action checklist' : 'Ask your notice'}</strong></div>
          <div className="topbar-right">
            <div className={`connection ${serverStatus}`}><span />{serverStatus === 'checking' ? 'Connecting' : serverStatus === 'online' && configured ? 'Gemma connected' : serverStatus === 'online' ? 'API key needed' : 'Server offline'}</div>
            <button className="icon-button" title="Notifications" onClick={() => setToast('You’re all caught up.')}><Bell size={17} /></button>
            {analysis && <button className="button primary compact" onClick={() => inputRef.current?.click()}><Plus size={15} /> New notice</button>}
          </div>
        </header>

        <div className="page-content">
          {!analysis ? (
            <>
              <div className="page-heading"><div><p className="overline">A CLEARER WAY TO KEEP UP</p><h2>Your notice workspace</h2><p>Turn official updates into clear, manageable next steps.</p></div><div className="date-pill"><Clock3 size={15} /> {new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</div></div>
              {file ? (
                <div className="selected-file-wrap">
                  <div className="selected-file"><div className="file-badge"><FileText size={22} /></div><div className="selected-file-info"><strong>{file.name}</strong><span>{fileKind} · {formatBytes(file.size)}</span></div><button className="icon-button" onClick={() => resetForFile(null)} aria-label="Remove file"><X size={17} /></button></div>
                  <div className="selected-file-actions"><div><span className="file-ready-dot" /> Ready for analysis</div><button className="button primary" onClick={analyze} disabled={isAnalyzing || !configured}>{isAnalyzing ? <><LoaderCircle className="spin" size={16} /> Reading notice...</> : <><Sparkles size={16} /> Analyse notice <ArrowRight size={15} /></>}</button></div>
                </div>
              ) : <EmptyState onTrySample={trySampleNotice} onChooseFile={() => inputRef.current?.click()} />}
              {serverStatus === 'offline' && <div className="setup-banner"><div className="setup-icon"><Zap size={18} /></div><div><strong>Backend not running</strong><p>From the project folder, run <code>npm run dev</code> in your terminal and refresh this page.</p></div></div>}
              {serverStatus === 'online' && !configured && <div className="setup-banner"><div className="setup-icon"><Zap size={18} /></div><div><strong>One quick setup step</strong><p>Add your Google AI Studio key to <code>server/.env</code> as <code>GEMINI_API_KEY</code>, then restart the backend to enable live Gemma analysis.</p></div></div>}
              {error && <div className="error-banner"><X size={17} /><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
            </>
          ) : (
            <>
              <div className="page-heading results-heading"><div><p className="overline">NOTICE ANALYSIS</p><div className="title-line"><h2>{analysis.title || file?.name || 'Notice overview'}</h2><span className="analysed-pill"><CheckCircle2 size={13} /> Analysed</span></div><p className="source-meta"><FileText size={14} /> {file?.name} <span>·</span> Analysed with {model}</p></div><button className="button secondary" onClick={() => inputRef.current?.click()}><Plus size={16} /> Upload another</button></div>
              {error && <div className="error-banner"><X size={17} /><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}

              {activeView === 'overview' && <>
                <section className="summary-banner">
                  <div className="summary-icon"><Sparkles size={21} /></div>
                  <div className="summary-content"><div className="section-kicker">THE SHORT VERSION</div><p>{analysis.summary || 'Gemma has analysed this notice. Review the extracted details below.'}</p><div className="summary-source">{analysis.organization || 'Issuing organisation not specified'} <span>·</span> {analysis.noticeType || 'Notice'}</div></div>
                  <div className={`urgency-tag ${['high','medium','low'].includes(analysis.urgency) ? analysis.urgency : 'unknown'}`}><span /> {analysis.urgency || 'unknown'} priority</div>
                </section>
                <section className="metric-grid">
                  <div className="metric-card deadline-metric"><div className="metric-top"><span>KEY DEADLINE</span><CalendarClock size={17} /></div><strong>{analysis.deadline?.dateISO ? shortDate(analysis.deadline.dateISO) : analysis.deadline?.label || 'Not specified'}</strong><small>{countdown ? countdown.label : analysis.deadline?.dateISO ? 'Date extracted from notice' : 'Check the original notice'}</small>{analysis.deadline?.evidence && <div className="metric-evidence">“{analysis.deadline.evidence}”</div>}</div>
                  <div className="metric-card"><div className="metric-top"><span>ACTION ITEMS</span><ClipboardCheck size={17} /></div><strong>{actionSteps.length.toString().padStart(2, '0')}</strong><small>{completedTasks.length} completed · {Math.max(0, actionSteps.length - completedTasks.length)} remaining</small><div className="mini-progress"><span style={{ width: `${completionPercent}%` }} /></div></div>
                  <div className="metric-card"><div className="metric-top"><span>DOCUMENTS NEEDED</span><FileCheck2 size={17} /></div><strong>{documents.length.toString().padStart(2, '0')}</strong><small>Items mentioned in the notice</small></div>
                </section>
                <div className="content-grid">
                  <div className="content-column">
                    <section className="panel"><div className="panel-heading"><div className="panel-icon blue"><Sparkles size={17} /></div><div><h3>What matters</h3><p>The important points, without the fine-print fog.</p></div></div><div className="point-list">{keyPoints.length ? keyPoints.map((point, index) => <div className="point-item" key={index}><span className="point-check"><Check size={13} /></span><div><p>{point.text || point}</p>{point.evidence && <Evidence>{point.evidence}</Evidence>}</div></div>) : <p className="muted-empty">No key points were extracted. Check the original notice.</p>}</div></section>
                    <section className="panel"><div className="panel-heading"><div className="panel-icon lavender"><GraduationCap size={18} /></div><div><h3>Eligibility at a glance</h3><p>Requirements explicitly mentioned in the notice.</p></div></div><div className="criteria-list">{eligibility.length ? eligibility.map((item, index) => <div className="criteria-item" key={index}><CheckCircle2 size={16} /><div><p>{item.requirement || item}</p>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>) : <p className="muted-empty">No eligibility requirements were clearly identified.</p>}</div><div className="info-note"><CircleHelp size={15} /><span>These are extracted criteria, not a personal eligibility decision. Your circumstances may affect the result.</span></div></section>
                    <section className="panel"><div className="panel-heading"><div className="panel-icon mint"><CalendarClock size={17} /></div><div><h3>Important dates</h3><p>Dates found in the source document.</p></div></div>{importantDates.length ? <div className="dates-list">{importantDates.map((date, index) => <div className="date-row" key={index}><div className="date-marker" /><div><strong>{date.label || 'Important date'}</strong><span>{date.dateText || (date.dateISO ? shortDate(date.dateISO) : 'Date unclear')}</span>{date.evidence && <Evidence>{date.evidence}</Evidence>}</div><time>{date.dateISO ? shortDate(date.dateISO) : 'VERIFY'}</time></div>)}</div> : <p className="muted-empty">No additional dates were extracted.</p>}</section>
                  </div>
                  <div className="content-column right-column">
                    <section className="panel task-panel"><div className="panel-heading"><div className="panel-icon orange"><ListChecks size={17} /></div><div><h3>Your next steps</h3><p>Tap each item as you complete it.</p></div></div><div className="task-progress-label"><span>{completedTasks.length} of {actionSteps.length} done</span><strong>{completionPercent}%</strong></div><div className="progress-track"><span style={{ width: `${completionPercent}%` }} /></div><div className="task-list">{actionSteps.length ? actionSteps.map((task, index) => <label className={`task-item ${completedTasks.includes(index) ? 'done' : ''}`} key={index}><input type="checkbox" checked={completedTasks.includes(index)} onChange={() => toggleTask(index)} /><span className="custom-checkbox"><Check size={12} /></span><span className="task-copy"><strong>{task.task || task}</strong>{task.detail && <small>{task.detail}</small>}{task.evidence && <Evidence>{task.evidence}</Evidence>}</span></label>) : <p className="muted-empty">No action steps found. Review the source document for next steps.</p>}</div><button className="text-link" onClick={() => showView('checklist')}>Open full checklist <ArrowUpRight size={15} /></button></section>
                    <section className="panel documents-panel"><div className="panel-heading"><div className="panel-icon coral"><FileCheck2 size={17} /></div><div><h3>Keep these ready</h3><p>Documents requested in the notice.</p></div></div><div className="document-list">{documents.length ? documents.map((doc, index) => <div className="document-row" key={index}><FileText size={16} /><div><strong>{doc.document || doc}</strong>{doc.evidence && <Evidence>{doc.evidence}</Evidence>}</div></div>) : <p className="muted-empty">No document list found.</p>}</div></section>
                    <section className="ask-card"><div className="ask-card-icon"><MessageCircle size={19} /></div><div><strong>Still have questions?</strong><p>Ask Gemma about any detail in this notice.</p><button onClick={() => showView('ask')}>Ask your notice <ArrowRight size={14} /></button></div></section>
                  </div>
                </div>
                {analysis.cautions?.length > 0 && <section className="caution-panel"><div><ShieldCheck size={17} /><strong>Worth double-checking</strong></div><ul>{analysis.cautions.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
                <p className="disclaimer"><ShieldCheck size={14} /> Always verify deadlines, eligibility and requirements against the original notice. AI can miss details.</p>
              </>}

              {activeView === 'checklist' && <section className="wide-panel checklist-page"><div className="panel-heading"><div className="panel-icon orange"><ListChecks size={18} /></div><div><h3>Your action checklist</h3><p>One step at a time. Progress stays in this browser session.</p></div></div><div className="checklist-summary"><div><strong>{completedTasks.length}/{actionSteps.length}</strong><span>tasks completed</span></div><div className="big-progress"><span style={{ width: `${completionPercent}%` }} /></div><strong>{completionPercent}%</strong></div><div className="full-task-list">{actionSteps.map((task, index) => <label className={`full-task ${completedTasks.includes(index) ? 'done' : ''}`} key={index}><input type="checkbox" checked={completedTasks.includes(index)} onChange={() => toggleTask(index)} /><span className="custom-checkbox"><Check size={13} /></span><span className="full-task-text"><strong>{task.task || task}</strong>{task.detail && <small>{task.detail}</small>}{task.evidence && <Evidence>{task.evidence}</Evidence>}</span><span className="task-status">{completedTasks.includes(index) ? 'COMPLETED' : 'TO DO'}</span></label>)}</div></section>}

              {activeView === 'ask' && <section className="wide-panel chat-page"><div className="chat-heading"><div><p className="overline">YOUR PERSONAL NOTICE ASSISTANT</p><h3>Ask your notice</h3><p>Gemma answers using the document you uploaded, not general guesses.</p></div><div className="chat-model"><Sparkles size={14} /> Gemma 4</div></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={index}><div className="chat-avatar">{message.role === 'assistant' ? <Sparkles size={15} /> : 'You'}</div><div className="chat-bubble"><p>{message.content}</p>{message.evidenceQuotes?.length > 0 && <div className="chat-evidence"><span>NOTICE EVIDENCE</span>{message.evidenceQuotes.map((quote, quoteIndex) => <blockquote key={quoteIndex}>“{quote}”</blockquote>)}</div>}{message.notInNotice && <div className="not-found-note"><CircleHelp size={14} /> This detail was not found in the uploaded notice.</div>}{message.confidence && <div className="confidence">{message.confidence} confidence · based on uploaded notice</div>}</div></div>)}{isAsking && <div className="chat-message assistant"><div className="chat-avatar"><Sparkles size={15} /></div><div className="chat-bubble thinking"><span /><span /><span /></div></div>}<div ref={chatEndRef} /></div><div className="suggested-questions"><span>TRY ASKING</span>{['What is the last date to apply?', 'Which documents are required?', 'Who can apply for this?'].map((item) => <button key={item} onClick={() => askQuestion(item)} disabled={isAsking}>{item} <ArrowUpRight size={13} /></button>)}</div><form className="chat-input-row" onSubmit={(event) => { event.preventDefault(); askQuestion(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask something about this notice..." maxLength={1000} /><button type="submit" disabled={!question.trim() || isAsking}><ArrowUpRight size={17} /></button></form><div className="chat-footnote"><ShieldCheck size={13} /> Answers are grounded in your uploaded file. Verify important information in the original.</div></section>}
            </>
          )}
        </div>
        <footer className="footer"><span>© 2026 NoticeLens</span><span>Built for students, not paperwork.</span><span className="footer-gemma"><span /> Powered by Gemma 4</span></footer>
      </main>

      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,application/pdf,image/jpeg,image/png,image/webp,text/plain,text/markdown" hidden onChange={(event) => { handlePickedFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      {toast && <div className="toast"><CheckCircle2 size={16} /> {toast}</div>}
      {isDragging && <div className="drag-overlay"><div><CloudUpload size={36} /><strong>Drop your notice here</strong><span>PDF, image or text file</span></div></div>}
    </div>
  );
}

export default App;
