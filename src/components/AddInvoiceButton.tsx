import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Plus, Camera, X, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface AddInvoiceButtonProps {
  isMobile?: boolean;
}

export const AddInvoiceButton: React.FC<AddInvoiceButtonProps> = ({ isMobile = false }) => {
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
        toast({
          title: "File uploaded!",
          description: `${file.name} has been uploaded and is ready for processing.`,
        });
      };
      reader.readAsDataURL(file);
    } else {
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
    setIsMinimized(true); // Minimize the dialog instead of closing it

    try {
      // Convert base64 to blob
      const base64Response = await fetch(fileData);
      const blob = await base64Response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('data', blob, fileName);
      formData.append('file_name', fileName);

      const response = await fetch('https://sodhipg.app.n8n.cloud/webhook/b3e9dcc8-0c43-4614-a2eb-94c50264090c', {
        method: 'POST',
        body: formData
      });

      // Handle specific response codes
      if (response.status === 200) {
        toast({
          title: "Invoice processed successfully!",
          description: "Your invoice has been processed and added to the system.",
        });
        
        // Close the dialog after successful processing
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingFileName('');
          setIsMinimized(false);
          setOpen(false);
          setFileData(null);
          setFileName('');
        }, 2000);
        
      } else if (response.status === 409) {
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        
        toast({
          title: "Duplicate Invoice Detected",
          description: "Please check existing records.",
          variant: "destructive",
        });
        
      } else if (response.status === 429) {
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        
        toast({
          title: "Duplicate Invoice",
          description: "This invoice has already been processed in the system.",
          variant: "destructive",
        });
        
      } else if (response.status === 415) {
        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        
        toast({
          title: "Check Invoice",
          description: "There was an issue with the invoice format. Please check and try again.",
          variant: "destructive",
        });
        
      } else {
        // Handle other error responses
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response isn't JSON, use the status text
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      setIsProcessing(false);
      setProcessingFileName('');
      setIsMinimized(false);
      
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      toast({
        title: "Failed to submit invoice",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isMobile ? (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`transition-all duration-300 ${isMinimized ? 'sm:max-w-sm' : 'sm:max-w-md'}`}>
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
                        variant="ghost-destructive"
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
          <div className="py-6 px-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold">Processing Invoice</p>
                  <p className="text-xs text-muted-foreground truncate">{processingFileName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsProcessing(false);
                  setProcessingFileName('');
                  setIsMinimized(false);
                  setOpen(false);
                  setFileData(null);
                  setFileName('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* Infinite loading animation */}
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary to-primary/50 w-1/3 rounded-full animate-[slide-right_1.5s_ease-in-out_infinite]"></div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-muted-foreground font-medium">Analyzing document and extracting data</p>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/80">This will take 2-3 minutes</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};