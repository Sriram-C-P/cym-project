import React, { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { UploadCloud, FileText, CheckCircle2, ChevronLeft, MessageSquare } from 'lucide-react';

export default function UploadPage() {
  const { projectId } = useParams();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [projectId]);

  const fetchMeetings = async () => {
    try {
      const res = await client.get(`/projects/${projectId}/meetings`);
      setMeetings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    if (selectedFile.name.endsWith('.vtt') || selectedFile.name.endsWith('.txt')) {
      setFile(selectedFile);
    } else {
      alert("Please upload a .vtt or .txt file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await client.post(`/projects/${projectId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      fetchMeetings(); // Refresh list
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Workspace</h1>
          <p className="mt-1 text-slate-500">Upload transcripts to generate intelligence.</p>
        </div>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className="mx-auto h-16 w-16 text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">Drag & Drop your transcript</h3>
        <p className="text-sm text-slate-500 mt-2">Supports .vtt and .txt formats</p>
        
        <div className="mt-8">
          <label className="cursor-pointer bg-white text-slate-700 font-medium py-2 px-6 rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50 transition-colors inline-block">
            Browse Files
            <input type="file" className="hidden" accept=".vtt,.txt" onChange={handleFileChange} />
          </label>
        </div>

        {file && (
          <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Now'}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          Processed Transcripts
        </h2>
        
        {meetings.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No transcripts uploaded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold text-slate-900">{meeting.filename}</h3>
                    <div className="text-sm text-slate-500 flex gap-4 mt-1">
                      <span>{new Date(meeting.upload_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{meeting.word_count} words</span>
                    </div>
                  </div>
                </div>
                <Link to={`/project/${projectId}/meeting/${meeting.id}`} className="text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  Analyze <MessageSquare className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
