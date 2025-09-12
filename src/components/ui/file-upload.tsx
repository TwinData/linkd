import React, { useState } from "react";
import { Progress } from "./progress";
import { Button } from "./button";
import { Upload, Download } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => Promise<void>;
  accept?: string;
  buttonText: string;
  icon?: "upload" | "download";
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*",
  buttonText,
  icon = "upload"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setProgress(0);
    
    // Start progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Simulate progress up to 90% (the last 10% will be completed when the operation finishes)
        const newProgress = prev + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      await onFileSelect(file);
      // Complete the progress
      setProgress(100);
    } catch (error) {
      console.error("File operation failed:", error);
    } finally {
      clearInterval(progressInterval);
      // Reset after a delay to show the completed progress
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 1000);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
      />
      
      <Button 
        variant="outline" 
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {icon === "upload" ? (
          <Upload className="h-4 w-4 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {buttonText}
      </Button>
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
};

interface FileOperationButtonProps {
  onClick: () => Promise<void>;
  buttonText: string;
  icon?: "upload" | "download";
  variant?: "default" | "outline" | "secondary";
}

export const FileOperationButton: React.FC<FileOperationButtonProps> = ({
  onClick,
  buttonText,
  icon = "download",
  variant = "outline"
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    // Start progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      await onClick();
      // Complete the progress
      setProgress(100);
    } catch (error) {
      console.error("File operation failed:", error);
    } finally {
      clearInterval(progressInterval);
      // Reset after a delay to show the completed progress
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        variant={variant as any} 
        onClick={handleClick}
        disabled={isProcessing}
      >
        {icon === "upload" ? (
          <Upload className="h-4 w-4 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {buttonText}
      </Button>
      
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
};
