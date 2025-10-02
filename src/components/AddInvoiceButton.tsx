import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Plus, Camera, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auditService } from '@/services/auditService';

interface AddInvoiceButtonProps {
  isMobile?: boolean;
  onSuccess?: () => void;
}

export const AddInvoiceButton: React.FC<AddInvoiceButtonProps> = ({ isMobile = false, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Accept images and PDFs
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileData(event.target?.result as string);
        setFileName(file.name);
        
        // Log file validation success
        auditService.logInvoiceUploadStarted({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        });
        
        toast({
          title: "File uploaded!",
          description: `${file.name} has been uploaded and is ready for processing.`,
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Log file validation failure
      auditService.logDocumentProcessingFailed({
        file_name: file.name,
        error_message: `Invalid file type: ${file.type}. Only images and PDF files are supported.`,
        error_code: 'INVALID_FILE_TYPE'
      });
      
      toast({
        title: "Invalid file type",
        description: "Please upload an image or PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!fileData) {
      toast({
        title: "No file selected",
        description: "Please upload an invoice file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingFileName(fileName);
    setIsMinimized(true);

    try {
      console.log('Starting invoice upload:', fileName);
      
      // Extract base64 data
      const base64Data = fileData.split(',')[1];

      console.log('Sending to webhook with 5-minute timeout...');
      
      // Direct synchronous call with 5-minute timeout
      const response = await fetch(
        'https://sodhipg.app.n8n.cloud/webhook/b3e9dcc8-0c43-4614-a2eb-94c50264090c',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_name: fileName,
            file_data: base64Data,
            content_type: fileData.split(',')[0].split(':')[1].split(';')[0],
          }),
          signal: AbortSignal.timeout(300000) // 5 minute timeout
        }
      );

      console.log('Webhook response status:', response.status);

      // Handle success (200) - No response body
      if (response.status === 200) {
        console.log('Invoice processed successfully');
        
        await auditService.logInvoiceStatusChange('upload_success', {
          invoice_number: fileName,
          status_from: 'none',
          status_to: 'completed',
          field_changed: 'processing_status',
        });
        
        toast({
          title: "Success",
          description: "Invoice processed successfully!",
        });

        // Close dialog and refresh after brief delay
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingFileName('');
          setIsMinimized(false);
          setOpen(false);
          setFileData(null);
          setFileName('');
          if (onSuccess) onSuccess();
        }, 1500);
        
        return;
      }

      // Handle OCR issues (415) - Body: {"error": "check invoice"}
      if (response.status === 415) {
        console.log('OCR issue detected');
        
        await auditService.logDocumentProcessingFailed({
          file_name: fileName,
          error_message: 'OCR processing failed - please check invoice format',
          error_code: 'OCR_FAILED'
        });
        
        toast({
          title: "OCR Issue Detected",
          description: "Please check the invoice format and try again. Make sure the text is clear and readable.",
          variant: "destructive",
        });
        
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        return;
      }

      // Handle validation fails (406) - No response body
      if (response.status === 406) {
        console.log('Validation failed');
        
        await auditService.logDocumentProcessingFailed({
          file_name: fileName,
          error_message: 'Invoice validation failed',
          error_code: 'VALIDATION_FAILED'
        });
        
        toast({
          title: "Validation Failed",
          description: "Invoice data validation failed. Please verify the invoice information and try again.",
          variant: "destructive",
        });
        
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        return;
      }

      // Handle duplicate invoice (409) - Body: {"error": "Duplicate Invoice"}
      if (response.status === 409) {
        console.log('Duplicate invoice detected');
        
        await auditService.logInvoiceDataUpdate(fileName, {
          invoice_number: fileName,
          changes: [{ field: 'duplicate_detected', old_value: false, new_value: true }],
        });
        
        toast({
          title: "Duplicate Invoice",
          description: "This invoice has already been uploaded to the system.",
          variant: "destructive",
        });
        
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        return;
      }

      // Handle any other error status
      console.error('Unexpected response status:', response.status);
      throw new Error(`Unexpected response status: ${response.status}`);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      // Check if it's a timeout error
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      
      await auditService.logDocumentProcessingFailed({
        file_name: fileName,
        error_message: isTimeout 
          ? 'Request timeout after 5 minutes' 
          : error instanceof Error ? error.message : 'Unknown error',
        error_code: isTimeout ? 'TIMEOUT' : 'UNKNOWN_ERROR'
      });

      toast({
        title: isTimeout ? "Request Timeout" : "Processing Error",
        description: isTimeout 
          ? "The invoice processing took too long. Please try again or contact support if the issue persists."
          : error instanceof Error ? error.message : "Failed to process invoice. Please try again.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
      setProcessingFileName('');
      setIsMinimized(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isMobile ? (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`transition-all duration-300 ${isMinimized ? 'sm:max-w-md' : 'sm:max-w-md'}`}>
        {!isMinimized ? (
          <>
            <DialogHeader>
              <DialogTitle>Add New Invoice</DialogTitle>
              <DialogDescription>
                Upload an invoice file to add it to the processing queue.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Upload Area */}
              <div 
                className={`upload-area ${dragOver ? 'dragover' : ''} ${fileData ? 'border-success' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => !fileData && document.getElementById('add-invoice-file-input')?.click()}
              >
                {!fileData ? (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div className="text-center">
                      <h4 className="text-lg font-medium mb-2">Upload Invoice</h4>
                      <p className="text-muted-foreground mb-4">
                        Drop your invoice file here or click to browse
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Camera className="h-4 w-4" />
                        <span>Supports images and PDF files</span>
                      </div>
                    </div>
                    <input
                      id="add-invoice-file-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      {fileName.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-16 h-16 bg-red-100 rounded-lg mx-auto flex items-center justify-center">
                          <span className="text-red-600 font-semibold text-xs">PDF</span>
                        </div>
                      ) : (
                        <img 
                          src={fileData} 
                          alt="Invoice preview" 
                          className="max-h-32 w-auto mx-auto rounded-lg shadow-medium"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 hover:bg-background h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileData(null);
                          setFileName('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Ready for processing</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setFileData(null);
                    setFileName('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!fileData || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Invoice'
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Minimized Processing View */
          <div className="py-6 px-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Processing Invoice
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{processingFileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This may take 4-5 minutes...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
