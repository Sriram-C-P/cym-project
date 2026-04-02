import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function SentimentCharts({ meetingId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (meetingId) fetchSentiment();
  }, [meetingId]);

  const fetchSentiment = async () => {
    try {
      const res = await client.get(`/meetings/${meetingId}/sentiment`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <span className="text-slate-500 font-medium">Analyzing sentiment & tone...</span>
        <span className="text-sm text-slate-400 mt-1">This takes ~10 seconds.</span>
      </div>
    );
  }

  if (!data || !data.segments || data.segments.length === 0) {
    return <div className="text-center py-12 text-slate-500">No sentiment data available.</div>;
  }

  const getScoreColor = (score) => {
    if (score >= 0.2) return '#22c55e';
    if (score > -0.2) return '#94a3b8';
    return '#ef4444';
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Overall Meeting Tone</h3>
          <p className="text-sm text-slate-500 capitalize">{data.overall_label}</p>
        </div>
        <div className="text-4xl font-black tracking-tighter" style={{ color: getScoreColor(data.overall_score) }}>
          {data.overall_score > 0 ? '+' : ''}{data.overall_score.toFixed(2)}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-6">Sentiment Timeline</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.segments} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="approximate_position" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} />
              <YAxis domain={[-1, 1]} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const seg = payload[0].payload;
                    return (
                      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 text-sm max-w-xs z-50 relative">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-slate-900 uppercase tracking-wider text-xs">{seg.label}</p>
                          <span className="font-bold" style={{color: getScoreColor(seg.score)}}>{seg.score > 0 ? '+' : ''}{seg.score}</span>
                        </div>
                        <p className="text-slate-600 mb-3">{seg.summary}</p>
                        <p className="italic text-slate-500 border-l-2 border-slate-300 pl-3">"{seg.key_quote}"</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 4, 4]} barSize={40}>
                {data.segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.speakers && data.speakers.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-6">Speaker Breakdown</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.speakers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" domain={[-1, 1]} hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} />
                <ReferenceLine x={0} stroke="#e2e8f0" />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const spk = payload[0].payload;
                      return (
                         <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm max-w-xs z-50 relative">
                           <div className="flex items-center justify-between mb-1">
                             <p className="font-bold text-slate-900">{spk.name}</p>
                             <span className="font-bold" style={{color: getScoreColor(spk.score)}}>{spk.score > 0 ? '+' : ''}{spk.score}</span>
                           </div>
                           <p className="text-slate-600 capitalize text-xs mb-2">{spk.overall_sentiment}</p>
                           <p className="text-slate-500 italic">"{spk.notes}"</p>
                         </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.speakers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
