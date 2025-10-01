import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Plus, Camera, X, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auditService } from '@/services/auditService';
import { supabase } from '@/integrations/supabase/client';

interface AddInvoiceButtonProps {
  isMobile?: boolean;
  onSuccess?: () => void;
}

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const AddInvoiceButton: React.FC<AddInvoiceButtonProps> = ({ isMobile = false, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [uploadTrackingId, setUploadTrackingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set up real-time listener for processing status updates
  useEffect(() => {
    if (!uploadTrackingId) return;

    console.log('Setting up realtime listener for:', uploadTrackingId);

    const channel = supabase
      .channel(`invoice-processing-${uploadTrackingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `upload_tracking_id=eq.${uploadTrackingId}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newStatus = payload.new.processing_status as ProcessingStatus;
            console.log('Status updated to:', newStatus);
            
            setProcessingStatus(newStatus);

            if (newStatus === 'completed') {
              toast({
                title: "Success",
                description: "Invoice processed successfully!",
              });
              
              setTimeout(() => {
                setIsProcessing(false);
                setProcessingFileName('');
                setIsMinimized(false);
                setOpen(false);
                setFileData(null);
                setFileName('');
                setUploadTrackingId(null);
                setProcessingStatus(null);
                if (onSuccess) onSuccess();
              }, 1500);
            } else if (newStatus === 'failed') {
              const errorData = payload.new.processing_error;
              let errorMessage = "Failed to process invoice.";
              
              if (errorData) {
                try {
                  const parsed = JSON.parse(errorData);
                  errorMessage = parsed.message || errorMessage;
                } catch (e) {
                  errorMessage = errorData;
                }
              }

              toast({
                title: "Processing Failed",
                description: errorMessage,
                variant: "destructive",
              });
              
              setTimeout(() => {
                setIsProcessing(false);
                setProcessingFileName('');
                setIsMinimized(false);
                setOpen(false);
                setFileData(null);
                setFileName('');
                setUploadTrackingId(null);
                setProcessingStatus(null);
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime listener');
      supabase.removeChannel(channel);
    };
  }, [uploadTrackingId, onSuccess, toast]);

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
    setProcessingStatus('pending');

    try {
      console.log('Starting file upload:', fileName);
      
      // Create unique tracking ID
      const trackingId = `${Date.now()}_${fileName}`;
      setUploadTrackingId(trackingId);

      // Extract base64 data
      const base64Data = fileData.split(',')[1];

      console.log('Sending to webhook...');
      const webhookUrl = 'https://sodhipg.app.n8n.cloud/webhook/b40eec46-6ca3-44aa-a3eb-55744011a820';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: trackingId,
          file_data: base64Data,
          content_type: fileData.split(',')[0].split(':')[1].split(';')[0],
        }),
      });

      console.log('Webhook response status:', response.status);

      // Handle 201 response (async processing started)
      if (response.status === 201) {
        console.log('Upload accepted, creating pending invoice record');
        
        // Create pending invoice record
        const { error: insertError } = await supabase
          .from('invoices')
          .insert({
            upload_tracking_id: trackingId,
            processing_status: 'pending',
            processing_started_at: new Date().toISOString(),
            status: 'READY',
            invoice_no: 'Processing...',
            supplier_name: 'Processing...',
          });

        if (insertError) {
          console.error('Error creating pending invoice:', insertError);
          throw new Error('Failed to create invoice record');
        }

        setProcessingStatus('processing');
        
        toast({
          title: "Upload Received",
          description: "Your invoice is being processed...",
        });

        await auditService.logInvoiceStatusChange(trackingId, {
          invoice_number: trackingId,
          status_from: 'none',
          status_to: 'processing',
          field_changed: 'processing_status',
        });

        return;
      }

      // Handle error responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error:', errorText);
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          
          if (errorData.error === 'duplicate_invoice') {
            toast({
              title: "Duplicate Invoice",
              description: `Invoice ${errorData.invoice_number} already exists.`,
              variant: "destructive",
            });
            
            await auditService.logInvoiceDataUpdate(errorData.invoice_number, {
              invoice_number: errorData.invoice_number,
              changes: [{ field: 'duplicate_detected', old_value: false, new_value: true }],
            });
          } else if (errorData.error === 'unsupported_format') {
            toast({
              title: "Unsupported Format",
              description: "Please upload a PDF or image file (JPG, PNG).",
              variant: "destructive",
            });
          } else {
            throw new Error(errorData.message || 'Processing failed');
          }
        } catch (parseError) {
          throw new Error(`Failed to process invoice: ${response.status}`);
        }

        setIsProcessing(false);
        setProcessingFileName('');
        setIsMinimized(false);
        setOpen(false);
        setFileData(null);
        setFileName('');
        return;
      }

      // Unexpected success response (should be 201)
      console.warn('Unexpected response status:', response.status);
      throw new Error('Unexpected response from server');

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      await auditService.logInvoiceDataUpdate('unknown', {
        changes: [{ 
          field: 'upload_error', 
          old_value: null, 
          new_value: error instanceof Error ? error.message : 'Unknown error' 
        }],
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process invoice. Please try again.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
      setProcessingFileName('');
      setIsMinimized(false);
      setOpen(false);
      setFileData(null);
      setFileName('');
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
                    {processingStatus === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : processingStatus === 'failed' ? (
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {processingStatus === 'pending' && 'Uploading Invoice'}
                    {processingStatus === 'processing' && 'Processing Invoice'}
                    {processingStatus === 'completed' && 'Processing Complete!'}
                    {processingStatus === 'failed' && 'Processing Failed'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{processingFileName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 ml-2"
                onClick={() => {
                  setIsProcessing(false);
                  setProcessingFileName('');
                  setIsMinimized(false);
                  setOpen(false);
                  setFileData(null);
                  setFileName('');
                  setUploadTrackingId(null);
                  setProcessingStatus(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Loading animation */}
              {processingStatus !== 'completed' && processingStatus !== 'failed' && (
                <>
                  <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 w-1/3 rounded-full animate-[slide-right_2.5s_ease-in-out_infinite]"></div>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-muted-foreground font-medium">
                        {processingStatus === 'pending' ? 'Sending file to processing system...' : 'Analyzing document and extracting data'}
                      </p>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/80">
                      {processingStatus === 'pending' 
                        ? 'Uploading invoice...' 
                        : 'This may take a few minutes for complex documents'}
                    </p>
                  </div>
                </>
              )}
              
              {processingStatus === 'completed' && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">Invoice processed successfully!</p>
                </div>
              )}
              
              {processingStatus === 'failed' && (
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-medium text-destructive">Processing failed</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
