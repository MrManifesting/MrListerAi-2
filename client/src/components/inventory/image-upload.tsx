import { useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlus, Upload, X, CheckCircle2, Maximize2 } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
}

export function ImageUpload({ 
  onUpload, 
  maxSize = 5, // Default 5MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'] 
}: ImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    // Check file format
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: "Invalid file format",
        description: `Accepted formats: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);

    // Pass file to parent component
    onUpload(file);

    toast({
      title: "Image uploaded",
      description: "Your image has been successfully uploaded",
      variant: "default",
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const clearPreview = () => {
    setPreview(null);
    setShowPreviewDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card variant="elevated" className="slide-up">
      <CardContent className="p-6">
        {!preview ? (
          <div
            className={`upload-zone ${dragActive ? 'border-primary bg-primary/10 scale-[1.01]' : ''} cursor-pointer`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <div className={`rounded-full p-3 ${dragActive ? 'bg-primary/20' : 'bg-secondary'} transition-all duration-300`}>
                <ImagePlus className={`h-8 w-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <p className="font-medium text-lg">Click or drop image here</p>
              <p className="text-sm text-muted-foreground">
                Supports: {acceptedFormats.map(f => f.split('/')[1]).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum size: {maxSize}MB
              </p>
              <Button variant="gradient" size="lg" className="mt-2 font-medium">
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden shadow-md fade-in">
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent z-10 pointer-events-none" />
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-auto max-h-[300px] object-contain bg-black/5 cursor-pointer"
              onClick={() => setShowPreviewDialog(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                  e.preventDefault();
                  setShowPreviewDialog(true);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Open full size image preview"
            />

            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <Button
                variant="secondary"
                size="icon-sm"
                className="rounded-full shadow-lg bg-white/80 backdrop-blur-sm hover:bg-white/90"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreviewDialog(true);
                }}
                aria-label="Open full size preview"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                className="rounded-full shadow-lg bg-white/80 backdrop-blur-sm hover:bg-white/90"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon-sm"
                className="rounded-full shadow-lg bg-white/80 backdrop-blur-sm hover:bg-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPreview();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="absolute bottom-3 left-3 z-20">
              <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-lg">
                <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
                <span className="font-medium">Image ready for processing</span>
              </div>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
          accept={acceptedFormats.join(',')}
        />
      </CardContent>

      {/* Full Screen Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto flex items-center justify-center">
            {preview && (
              <img 
                src={preview} 
                alt="Full size preview" 
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}