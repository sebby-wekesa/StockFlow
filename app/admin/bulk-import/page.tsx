"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';
import { importMasterData, importStockCounts, generateImportTemplate } from '@/app/actions/bulk-import';

interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

export default function BulkImportPage() {
  const [importType, setImportType] = useState<'suppliers' | 'customers' | 'materials' | 'stock-counts'>('suppliers');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      // Upload file to temp storage (in production, use Supabase Storage)
      const formData = new FormData();
      formData.append('file', file);

      // For now, we'll simulate the file upload and use a local path
      // In production, upload to Supabase Storage first
      const tempFilePath = `/tmp/${Date.now()}-${file.name}`;

      let importResult: ImportResult;
      if (importType === 'stock-counts') {
        importResult = await importStockCounts(tempFilePath);
      } else {
        importResult = await importMasterData(tempFilePath, importType);
      }

      setResult(importResult);

      if (!importResult.success) {
        setError('Import completed with errors. Please review the results below.');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const buffer = await generateImportTemplate(importType);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${importType}_import_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download template: ' + err.message);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bulk Data Import</h1>
          <p className="text-[#7a8090]">Import master data and stock counts from Excel files</p>
        </div>
        <Button onClick={resetForm} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Type Selection */}
          <div>
            <label className="text-sm font-medium text-[#7a8090] mb-2 block">
              Import Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="w-full bg-[#1e2023] border border-[#2c2d33] rounded-lg p-3 text-white outline-none focus:border-[#f0c040]"
            >
              <option value="suppliers">Suppliers</option>
              <option value="customers">Customers</option>
              <option value="materials">Raw Materials</option>
              <option value="stock-counts">Stock Counts</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium text-[#7a8090] mb-2 block">
              Excel File (.xlsx or .xls)
            </label>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f0c040] file:text-black hover:file:bg-[#e6c039]"
              />
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="gap-2 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Template
              </Button>
            </div>
            {file && (
              <p className="text-sm text-[#7a8090] mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-[#f0c040] hover:bg-[#e6c039] text-black font-bold py-3"
          >
            {importing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Importing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Start Import
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Importing data...</span>
                <span className="text-sm text-[#7a8090]">Please wait</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{result.totalRows}</div>
                <div className="text-sm text-[#7a8090]">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{result.processedRows}</div>
                <div className="text-sm text-[#7a8090]">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{result.errors.length}</div>
                <div className="text-sm text-[#7a8090]">Errors</div>
              </div>
            </div>

            {/* Success Rate */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#7a8090]">Success Rate</span>
                <span className="text-white">
                  {result.totalRows > 0 ? Math.round((result.processedRows / result.totalRows) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={result.totalRows > 0 ? (result.processedRows / result.totalRows) * 100 : 0}
                className="w-full"
              />
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-red-500 mb-3">Errors</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-red-400">
                            Row {error.row} - {error.field}
                          </div>
                          <div className="text-sm text-red-300">{error.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-yellow-500 mb-3">Warnings</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-yellow-400">
                            Row {warning.row}
                          </div>
                          <div className="text-sm text-yellow-300">{warning.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-[#7a8090]">
            <p>• Download the Excel template to see the required format</p>
            <p>• Fields marked with * are required</p>
            <p>• Codes must be unique across the system</p>
            <p>• Email addresses must be valid if provided</p>
            <p>• Numeric fields should contain only numbers</p>
            <p>• File size limit: 10MB</p>
            <p>• Supported formats: .xlsx and .xls</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}