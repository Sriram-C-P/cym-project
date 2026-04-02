import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { ChevronLeft, FileDown } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import SentimentCharts from '../components/SentimentCharts';

function DecisionsTable({ decisions, loading }) {
  if (loading) return <div className="animate-pulse space-y-4 py-4"><div className="h-4 bg-slate-200 rounded w-3/4"></div><div className="h-4 bg-slate-200 rounded w-1/2"></div></div>;
  if (!decisions || decisions.length === 0) return <p className="text-slate-500 py-4">No decisions extracted.</p>;

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-semibold rounded-tl-lg">Summary</th>
            <th className="px-4 py-3 font-semibold">Context</th>
            <th className="px-4 py-3 font-semibold rounded-tr-lg">Speakers Involved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {decisions.map((d, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{d.summary}</td>
              <td className="px-4 py-3">{d.context}</td>
              <td className="px-4 py-3 text-xs">
                {(d.speakers_involved || []).map(s => (
                  <span key={s} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-1 mb-1">{s}</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionItemsTable({ actions, loading }) {
  if (loading) return <div className="animate-pulse space-y-4 py-4"><div className="h-4 bg-slate-200 rounded w-3/4"></div><div className="h-4 bg-slate-200 rounded w-1/2"></div></div>;
  if (!actions || actions.length === 0) return <p className="text-slate-500 py-4">No action items extracted.</p>;

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-semibold rounded-tl-lg">Task</th>
            <th className="px-4 py-3 font-semibold">Owner</th>
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold rounded-tr-lg">Due Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {actions.map((a, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{a.task}</td>
              <td className="px-4 py-3 font-medium">{a.owner}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${priorityColors[a.priority?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                  {a.priority || 'N/A'}
                </span>
              </td>
              <td className="px-4 py-3">{a.due_date || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MeetingDetail() {
  const { projectId, meetingId } = useParams();
  const [tab, setTab] = useState("decisions");
  const [extraction, setExtraction] = useState({ decisions: [], actions: [] });
  const [extLoading, setExtLoading] = useState(true);

  useEffect(() => {
    const fetchExtraction = async () => {
      try {
        const res = await client.get(`/meetings/${meetingId}/extraction`);
        setExtraction({ decisions: res.data.decisions, actions: res.data.actions });
      } catch (err) {
        console.error("Failed to extract:", err);
      } finally {
        setExtLoading(false);
      }
    };
    fetchExtraction();
  }, [meetingId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link to={`/project/${projectId}/upload`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meeting Analysis</h1>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab("decisions")}
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${tab === "decisions" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Decisions & Actions
        </button>
        <button
          onClick={() => setTab("sentiment")}
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${tab === "sentiment" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Sentiment Analysis
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${tab === "chat" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Chatbot
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {tab === "decisions" && (
          <div className="space-y-12">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">Key Decisions</h2>
                <button
                  onClick={() => window.open(`http://localhost:5000/api/meetings/${meetingId}/extraction/export`)}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <DecisionsTable decisions={extraction.decisions} loading={extLoading} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Action Items</h2>
              <ActionItemsTable actions={extraction.actions} loading={extLoading} />
            </div>
          </div>
        )}
        {tab === "sentiment" && (
          <div className="py-4">
            <SentimentCharts meetingId={meetingId} />
          </div>
        )}
        {tab === "chat" && (
          <div className="py-2">
            <ChatPanel projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
