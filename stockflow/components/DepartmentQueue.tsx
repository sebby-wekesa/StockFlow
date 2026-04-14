"use client";
import { useState, useEffect, useCallback } from 'react';
import { Package, ArrowRight, Loader2, ClipboardList } from 'lucide-react';
import StageLoggingModal from './StageLoggingModal';

interface DepartmentQueueProps {
  userDept: string;
}

export default function DepartmentQueue({ userDept }: { userDept: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch jobs assigned to this department
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Filtering for orders currently at this department's sequence
      const res = await fetch(`/api/production-orders?dept=${userDept}&status=APPROVED,IN_PRODUCTION`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
    }
  }, [userDept]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleOpenLog = (job: any) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 className="animate-spin mb-4" size={32} />
      <p>Loading {userDept} Queue...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="text-blue-500" />
          {userDept} Queue
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full">
            {jobs.length} Active
          </span>
        </h2>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Package className="mx-auto text-slate-700 mb-4" size={48} />
          <p className="text-slate-500">No pending jobs for this department.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all p-6 rounded-xl flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                    {job.orderNumber}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{job.design.name}</h3>
                </div>
                <p className="text-slate-400 text-sm">{job.design.code} • Target Quantity: {job.quantity}</p>
                
                <div className="flex gap-4 mt-3">
                  <div className="text-xs text-slate-500">
                    <span className="block uppercase text-[10px] text-slate-600 font-bold">Input Weight</span>
                    <span className="text-slate-300 font-mono">{job.targetKg} kg</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleOpenLog(job)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-900/20"
              >
                Start Processing
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* The Logging Modal */}
      {selectedJob && (
        <StageLoggingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJob(null);
          }}
          order={selectedJob}
          onSuccess={fetchJobs} // Refresh queue after successful log
        />
      )}
    </div>
  );
}