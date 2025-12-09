import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InvoiceService } from '../../services/invoice.service';

interface FileUploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  invoiceCount?: number;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatListModule,
    MatDialogModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  private invoiceService = inject(InvoiceService);
  private dialogRef = inject(MatDialogRef<UploadComponent>, { optional: true });
  
  files = signal<FileUploadStatus[]>([]);
  isDragging = signal(false);
  uploadComplete = output<void>();

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.handleFiles(Array.from(droppedFiles));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(selectedFiles: File[]): void {
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      if (file.type !== 'application/pdf') {
        alert(`${file.name} is not a PDF file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to list
    const fileStatuses: FileUploadStatus[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));

    this.files.set([...this.files(), ...fileStatuses]);

    // Start upload
    this.uploadFiles(validFiles);
  }

  private async uploadFiles(filesToUpload: File[]): Promise<void> {
    // Update status to uploading
    this.files.update(files => 
      files.map(f => 
        filesToUpload.includes(f.file) 
          ? { ...f, status: 'uploading' as const, progress: 50 }
          : f
      )
    );

    this.invoiceService.uploadPDFs(filesToUpload).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const results = response.data.results;
          
          this.files.update(files =>
            files.map(f => {
              // Only update files that were in this upload batch
              if (!filesToUpload.includes(f.file)) {
                return f;
              }

              const result = results.find((r: any) => r.filename === f.file.name);
              if (result) {
                return {
                  ...f,
                  progress: 100,
                  status: result.success ? 'success' as const : 'error' as const,
                  message: result.success 
                    ? `${result.inserted} invoices added` 
                    : result.error,
                  invoiceCount: result.inserted
                };
              }
              
              // If no result found for this file, mark as error
              return {
                ...f,
                status: 'error' as const,
                progress: 0,
                message: 'No response received for this file'
              };
            })
          );

          this.uploadComplete.emit();
          
          // Close dialog after successful upload (with small delay to show success state)
          if (this.dialogRef) {
            setTimeout(() => {
              this.dialogRef?.close(true);
            }, 1500);
          }
        } else {
          // Handle case where response.success is false or no data
          this.files.update(files =>
            files.map(f =>
              filesToUpload.includes(f.file)
                ? { ...f, status: 'error' as const, progress: 0, message: 'Upload failed - no data received' }
                : f
            )
          );
        }
      },
      error: (err) => {
        console.error('Upload error:', err);
        const errorMessage = err?.error?.error || err?.message || 'Upload failed';
        
        this.files.update(files =>
          files.map(f =>
            filesToUpload.includes(f.file)
              ? { ...f, status: 'error' as const, progress: 0, message: errorMessage }
              : f
          )
        );
      }
    });
  }

  clearFiles(): void {
    this.files.set([]);
  }

  removeFile(index: number): void {
    this.files.update(files => files.filter((_, i) => i !== index));
  }
}

