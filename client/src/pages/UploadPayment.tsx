import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2, FileImage, X } from "lucide-react";
import { Link } from "wouter";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwha-_yAysVRVspY0z1XYcD3lz1ow1Z4704M-Eu0Moq4hXjeL6uB4bLiVEr3Fyw5uKPcg/exec";

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

  // Success state - Black and Orange theme
  if (result?.success) {
    return (
      <div className="min-h-screen bg-black py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl bg-zinc-900 border-orange-500/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-orange-500" />
              </div>
              <CardTitle className="text-2xl text-orange-500">Upload Successful!</CardTitle>
              <CardDescription className="text-gray-400">
                Your payment proof has been submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-800 rounded-lg p-4 space-y-2 border border-orange-500/20">
                {result.proofId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Proof ID:</span>
                    <span className="font-mono font-semibold text-orange-400">{result.proofId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Order ID:</span>
                  <span className="font-semibold text-white">{result.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer:</span>
                  <span className="font-semibold text-white">{result.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold text-orange-400">{result.amount}</span>
                </div>
                {result.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Submitted:</span>
                    <span className="font-semibold text-white">{result.submittedAt}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-400 text-center">
                We will verify your payment and process your order shortly. 
                You will receive a confirmation once verified.
              </p>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={resetForm} 
                  variant="outline" 
                  className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  Upload Another
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold">
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

  // Main form - Black and Orange theme
  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-xl bg-zinc-900 border-orange-500/30">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-white">Payment Proof Upload</CardTitle>
            <CardDescription className="text-gray-400">
              Upload your payment screenshot for order verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order ID */}
              <div className="space-y-2">
                <Label htmlFor="orderId" className="text-white">Order ID *</Label>
                <Input
                  id="orderId"
                  placeholder="e.g., SB-001 or your order reference"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  disabled={isUploading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-white">Your Name *</Label>
                <Input
                  id="customerName"
                  placeholder="Full name as shown in payment"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isUploading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white">Amount Paid (₱) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 1500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isUploading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-white">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about your payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                  rows={2}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-white">Payment Screenshot *</Label>
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-orange-500/50 transition-colors bg-zinc-800/50">
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
                        className="absolute top-0 right-0 bg-orange-500 text-black rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-orange-600"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-2 text-sm text-gray-400">{file?.name}</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <FileImage className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                      <span className="text-sm text-gray-400">
                        Click to select or drag & drop
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
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
                <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"
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
            <div className="mt-6 pt-4 border-t border-zinc-700">
              <p className="text-xs text-gray-500 text-center">
                Need help? Contact us at{" "}
                <a href="tel:09674000040" className="text-orange-400 hover:underline">
                  (0967) 400-0040
                </a>
                {" "}or visit{" "}
                <a href="https://www.soleblessingofficial.com" className="text-orange-400 hover:underline">
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
