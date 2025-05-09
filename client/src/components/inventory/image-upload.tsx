import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, ImagePlus, FileX, Check } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  onAnalysisComplete: (analysisId: number, results: any) => void;
}

export function ImageUpload({ onAnalysisComplete }: ImageUploadProps) {
  const { toast } = useToast();
  const [processingFiles, setProcessingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);

  // Analyze image mutation
  const analyzeMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      console.log(`Sending image with base64 length: ${imageBase64.length}`);
      // Add timeout to handle long-running API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await apiRequest(
          "POST", 
          "/api/analyze/image", 
          { imageBase64 },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Image analysis request timed out. Please try again with a smaller image.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Analysis complete with data:", { analysisId: data.analysisId });
      
      if (!data.analysisId || !data.results) {
        console.error("Invalid response data:", data);
        toast({
          title: "Analysis returned invalid data",
          description: "There was an issue with the analysis results. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      onAnalysisComplete(data.analysisId, data.results);
      
      // Update progress
      setFileProgress((currentFileIndex + 1) / processingFiles.length * 100);
      
      // Process next file if available
      setCurrentFileIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex < processingFiles.length) {
          processFile(processingFiles[nextIndex]);
          return nextIndex;
        }
        // All files processed
        setProcessingFiles([]);
        setFileProgress(100);
        return 0;
      });
    },
    onError: (error) => {
      console.error("Image analysis error:", error);
      
      toast({
        title: "Analysis failed",
        description: error.message || "There was an error analyzing your image. Please try again.",
        variant: "destructive",
      });
      
      // Process next file if available
      setCurrentFileIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex < processingFiles.length) {
          processFile(processingFiles[nextIndex]);
          return nextIndex;
        }
        // All files processed even with errors
        setProcessingFiles([]);
        return 0;
      });
    },
  });

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Verify we have a proper data URL
          if (!result || !result.includes('base64,')) {
            reject(new Error('Invalid image data format'));
            return;
          }
          
          // Extract the base64 part without the data URL prefix
          const base64 = result.split('base64,')[1];
          if (!base64) {
            reject(new Error('Could not extract base64 data from image'));
            return;
          }
          
          console.log(`Successfully extracted base64 data, length: ${base64.length}`);
          resolve(base64);
        } catch (error) {
          console.error('Error processing file data:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
    });
  };

  // Process a single file
  const processFile = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      analyzeMutation.mutate(base64);
    } catch (error) {
      toast({
        title: "Error processing file",
        description: "There was an error processing your image file.",
        variant: "destructive",
      });
      
      // Try next file
      setCurrentFileIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex < processingFiles.length) {
          processFile(processingFiles[nextIndex]);
          return nextIndex;
        }
        setProcessingFiles([]);
        return 0;
      });
    }
  };

  // Start processing uploaded files
  const handleFilesUploaded = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setProcessingFiles(acceptedFiles);
    setCurrentFileIndex(0);
    setFileProgress(0);
    
    // Start with the first file
    processFile(acceptedFiles[0]);
  };

  // Configure dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for image files under 10MB
    const validFiles = acceptedFiles.filter(
      file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please upload image files (PNG, JPG, GIF) under 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    if (validFiles.length !== acceptedFiles.length) {
      toast({
        title: "Some files were skipped",
        description: "Only image files under 10MB are accepted.",
      });
    }
    
    handleFilesUploaded(validFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`upload-zone ${
          isDragActive ? "border-primary bg-primary/5" : ""
        } ${processingFiles.length > 0 ? "pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        {processingFiles.length === 0 && (
          <div className="space-y-3">
            {isDragActive ? (
              <Upload className="mx-auto h-10 w-10 text-primary" />
            ) : (
              <ImagePlus className="mx-auto h-10 w-10 text-gray-400" />
            )}
            <div className="flex flex-col items-center text-sm text-gray-600">
              <span className="cursor-pointer font-medium text-primary hover:text-primary-dark">
                Upload product images
              </span>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
        
        {processingFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-2 text-sm font-medium text-gray-900">
                Analyzing {currentFileIndex + 1} of {processingFiles.length} images...
              </p>
            </div>
            <Progress value={fileProgress} className="h-2 w-full max-w-md mx-auto" />
          </div>
        )}
      </div>

      {processingFiles.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700">
                AI is analyzing your products. This may take a minute...
              </p>
              <p className="mt-3 text-sm md:mt-0 md:ml-6">
                <span className="font-medium text-blue-700">
                  {currentFileIndex + 1} of {processingFiles.length}
                </span>{" "}
                <span className="text-blue-700">items processed</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
