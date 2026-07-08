'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { jobsApi } from '@/lib/api';
import GlowButton from '@/components/ui/GlowButton';
import type { Project } from '@/types';
import { clsx } from 'clsx';

interface UploadDatasetProps {
  projects: Project[];
  onJobStarted: (jobId: string) => void;
}

export default function UploadDataset({ projects, onJobStarted }: UploadDatasetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }
    if (!selectedProject) { setError('Please select a project'); return; }

    setUploading(true);
    setError(null);
    try {
      const result = await jobsApi.upload(
        file,
        selectedProject.id,
        selectedProject.name,
        selectedProject.config,
      );
      setSuccess(true);
      onJobStarted(result.job_id);
      setTimeout(() => { setFile(null); setSuccess(false); }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'upload-zone p-8 text-center cursor-pointer transition-all group',
          isDragActive && 'active border-cyan-500/50 bg-cyan-950/10'
        )}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-center">
                <FileSpreadsheet size={22} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-400 leading-tight">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-2 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <motion.div
                animate={isDragActive ? { scale: [1, 1.1, 1], y: [0, -4, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-12 h-12 rounded-xl bg-white/3 flex items-center justify-center mx-auto mb-1 border border-white/5 group-hover:border-cyan-500/30 group-hover:bg-cyan-950/10 transition-all"
              >
                <Upload size={18} className={clsx('transition-colors duration-300', isDragActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400 group-hover:text-cyan-400')} />
              </motion.div>
              <p className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors leading-normal">
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to select'}
              </p>
              <p className="text-xs text-slate-500">Supports CSV, XLSX, XLS, JSON</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Project selector */}
      <div className="relative">
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="w-full input-glass px-4 py-3 flex items-center justify-between text-sm"
        >
          <span className={selectedProject ? 'text-white' : 'text-slate-500'}>
            {selectedProject ? selectedProject.name : 'Select project...'}
          </span>
          <ChevronDown size={16} className={clsx('text-slate-500 transition-transform', projectOpen && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {projectOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 w-full mt-1 glass-card border border-white/10 rounded-xl overflow-hidden"
            >
              {projects.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">No projects configured. Go to Settings.</p>
              ) : (
                projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProject(p); setProjectOpen(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </div>
                    {selectedProject?.id === p.id && <Check size={14} className="text-cyan-400" />}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs text-red-400 flex items-center gap-1">
            <X size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <GlowButton
        color={success ? 'emerald' : 'cyan'}
        fullWidth
        loading={uploading}
        icon={success ? <Check size={16} /> : <Upload size={16} />}
        onClick={handleUpload}
        disabled={!file || !selectedProject}
      >
        {success ? 'Job Started!' : 'Start Enrichment'}
      </GlowButton>
    </div>
  );
}
