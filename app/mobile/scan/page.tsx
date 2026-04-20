"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera,
  Flashlight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Package,
  Truck,
  Smartphone,
  Wifi,
  WifiOff
} from 'lucide-react';
import { scanBarcode, processScan } from '@/app/actions/scanning';

interface ScanResult {
  type: 'raw_material' | 'finished_goods';
  barcode: string;
  batchNumber?: string;
  name: string;
  details: string;
  supplier?: string;
  designCode?: string;
}

export default function MobileScanningPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for processing scans
  const [scanForm, setScanForm] = useState({
    kgIn: '',
    kgOut: '',
    scrapReason: '',
    notes: ''
  });

  useEffect(() => {
    // Check online status
    const checkOnline = () => setIsOnline(navigator.onLine);
    checkOnline();
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  const handleScan = async (barcode?: string) => {
    if (!barcode && !manualBarcode.trim()) return;

    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await scanBarcode(barcode || manualBarcode.trim());
      setScanResult(result);
      setManualBarcode('');
    } catch (err: any) {
      setError(err.message || 'Failed to scan barcode');
    } finally {
      setScanning(false);
    }
  };

  const handleProcessScan = async () => {
    if (!scanResult) return;

    setProcessing(true);
    setError(null);

    try {
      await processScan({
        barcode: scanResult.barcode,
        type: scanResult.type,
        kgIn: parseFloat(scanForm.kgIn) || 0,
        kgOut: parseFloat(scanForm.kgOut) || 0,
        scrapReason: scanForm.scrapReason || undefined,
        notes: scanForm.notes || undefined
      });

      setSuccess(`${scanResult.type === 'raw_material' ? 'Material' : 'Finished goods'} processed successfully`);
      setScanResult(null);
      setScanForm({ kgIn: '', kgOut: '', scrapReason: '', notes: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to process scan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1113] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-8 w-8 text-[#f0c040]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Mobile Scanner</h1>
            <p className="text-sm text-[#7a8090]">Scan barcodes for quick processing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {/* Scanning Interface */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Scan Button */}
          <Button
            onClick={() => handleScan()}
            disabled={scanning}
            className="w-full h-16 bg-[#f0c040] hover:bg-[#e6c039] text-black font-bold text-lg"
          >
            {scanning ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Scanning...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6" />
                Tap to Scan
              </div>
            )}
          </Button>

          {/* Manual Entry */}
          <div className="text-center text-[#7a8090] text-sm">or enter manually</div>
          <div className="flex gap-2">
            <Input
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value.toUpperCase())}
              placeholder="Enter barcode manually..."
              className="flex-1"
            />
            <Button
              onClick={() => handleScan()}
              disabled={!manualBarcode.trim() || scanning}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.type === 'raw_material' ? (
                <Package className="h-5 w-5 text-blue-500" />
              ) : (
                <Truck className="h-5 w-5 text-green-500" />
              )}
              Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#1e2023] p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-white">{scanResult.name}</h3>
                <Badge variant="outline">{scanResult.type.replace('_', ' ').toUpperCase()}</Badge>
              </div>
              <p className="text-sm text-[#7a8090] mb-2">{scanResult.details}</p>
              <div className="text-xs text-[#7a8090]">
                Barcode: {scanResult.barcode}
                {scanResult.batchNumber && <><br />Batch: {scanResult.batchNumber}</>}
                {scanResult.supplier && <><br />Supplier: {scanResult.supplier}</>}
                {scanResult.designCode && <><br />Design: {scanResult.designCode}</>}
              </div>
            </div>

            {/* Processing Form */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Process {scanResult.type === 'raw_material' ? 'Material' : 'Finished Goods'}</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kgIn">KG In</Label>
                  <Input
                    id="kgIn"
                    type="number"
                    step="0.001"
                    value={scanForm.kgIn}
                    onChange={(e) => setScanForm(prev => ({ ...prev, kgIn: e.target.value }))}
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label htmlFor="kgOut">KG Out</Label>
                  <Input
                    id="kgOut"
                    type="number"
                    step="0.001"
                    value={scanForm.kgOut}
                    onChange={(e) => setScanForm(prev => ({ ...prev, kgOut: e.target.value }))}
                    placeholder="0.000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="scrapReason">Scrap Reason (Optional)</Label>
                <select
                  id="scrapReason"
                  value={scanForm.scrapReason}
                  onChange={(e) => setScanForm(prev => ({ ...prev, scrapReason: e.target.value }))}
                  className="w-full bg-[#1e2023] border border-[#2c2d33] rounded-lg p-3 text-white outline-none"
                >
                  <option value="">Select reason...</option>
                  <option value="off-cuts">Off-cuts</option>
                  <option value="scale">Scale</option>
                  <option value="swarf">Swarf</option>
                  <option value="defective">Defective</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={scanForm.notes}
                  onChange={(e) => setScanForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleProcessScan}
                  disabled={processing}
                  className="flex-1 bg-[#f0c040] hover:bg-[#e6c039] text-black font-bold"
                >
                  {processing ? 'Processing...' : 'Process Scan'}
                </Button>
                <Button
                  onClick={() => setScanResult(null)}
                  variant="outline"
                  className="px-4"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-16 flex-col gap-2">
              <Package className="h-6 w-6" />
              <span className="text-xs">Recent Scans</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2">
              <Truck className="h-6 w-6" />
              <span className="text-xs">Batch Mode</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}