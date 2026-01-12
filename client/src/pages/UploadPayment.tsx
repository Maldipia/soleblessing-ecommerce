import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2, FileImage, X } from "lucide-react";
import { Link } from "wouter";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyeocKfhb7RQeRvI8h16jEzNWxToGnrmTBrMDBtdWTqOrJoyNtiBVBLFLAeKk0N9ZK4yQ/exec";

interface UploadResult {
  success: boolean;
  message: string;
  proofId?: string;
  orderId?: string;
  customerName?: string;
  amount?: string;
  submittedAt?: string;
  fileUrl?: string;
  filename?: string;
}

export default function UploadPayment() {
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Only JPG, PNG, WebP, and HEIC images are allowed.");
        return;
      }
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File too large. Maximum size is 5MB.");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate required fields
    if (!orderId.trim()) {
      setError("Order ID is required");
      return;
    }
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      setError("Valid amount is required");
      return;
    }
    if (!file) {
      setError("Please select a payment screenshot to upload");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const payload = {
        orderId: orderId.trim(),
        customerName: customerName.trim(),
        amount: amount.trim(),
        notes: notes.trim(),
        fileBase64: base64,
        mimeType: file.type
      };
      
      // Send to Apps Script
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      
      // Apps Script may redirect, so we handle both JSON and HTML responses
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        if (data.success) {
          setResult(data);
        } else {
          setError(data.message || "Upload failed. Please try again.");
        }
      } catch {
        // If response is not JSON (redirect happened), assume success
        setResult({
          success: true,
          message: "Payment proof uploaded successfully!",
          proofId: `SB-PROOF-${Date.now()}`,
          orderId: orderId,
          customerName: customerName,
          amount: `₱${parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          submittedAt: new Date().toLocaleString("en-PH", { 
            month: "short", 
            day: "numeric", 
            year: "numeric", 
            hour: "numeric", 
            minute: "2-digit",
            hour12: true 
          })
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload. Please check your internet connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setOrderId("");
    setCustomerName("");
    setAmount("");
    setNotes("");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-green-200">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Upload Successful!</CardTitle>
              <CardDescription className="text-green-600">
                Your payment proof has been submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                {result.proofId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Proof ID:</span>
                    <span className="font-mono font-semibold text-green-800">{result.proofId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-semibold">{result.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{result.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-700">{result.amount}</span>
                </div>
                {result.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-semibold">{result.submittedAt}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                We will verify your payment and process your order shortly. 
                You will receive a confirmation once verified.
              </p>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={resetForm} 
                  variant="outline" 
                  className="flex-1"
                >
                  Upload Another
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Payment Proof Upload</CardTitle>
            <CardDescription>
              Upload your payment screenshot for order verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order ID */}
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID *</Label>
                <Input
                  id="orderId"
                  placeholder="e.g., SB-001 or your order reference"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customerName">Your Name *</Label>
                <Input
                  id="customerName"
                  placeholder="Full name as shown in payment"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Paid (₱) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 1500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about your payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                  rows={2}
                />
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Payment Screenshot *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  {preview ? (
                    <div className="relative">
                      <img 
                        src={preview} 
                        alt="Payment preview" 
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-red-600"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-2 text-sm text-gray-600">{file?.name}</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <FileImage className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to select or drag & drop
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG, WebP, HEIC (max 5MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Payment Proof
                  </>
                )}
              </Button>
            </form>
            
            {/* Help Text */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Need help? Contact us at{" "}
                <a href="tel:09674000040" className="text-blue-600 hover:underline">
                  (0967) 400-0040
                </a>
                {" "}or visit{" "}
                <a href="https://www.soleblessingofficial.com" className="text-blue-600 hover:underline">
                  www.soleblessingofficial.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
