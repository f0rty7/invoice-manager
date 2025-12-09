import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
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
    MatListModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  files = signal<FileUploadStatus[]>([]);
  isDragging = signal(false);
  uploadComplete = output<void>();

  constructor(private invoiceService: InvoiceService) {}

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
          ? { ...f, status: 'uploading', progress: 50 }
          : f
      )
    );

    this.invoiceService.uploadPDFs(filesToUpload).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const results = response.data.results;
          
          this.files.update(files =>
            files.map(f => {
              const result = results.find((r: any) => r.filename === f.file.name);
              if (result) {
                return {
                  ...f,
                  progress: 100,
                  status: result.success ? 'success' : 'error',
                  message: result.success 
                    ? `${result.inserted} invoices added` 
                    : result.error,
                  invoiceCount: result.inserted
                };
              }
              return f;
            })
          );

          this.uploadComplete.emit();
        }
      },
      error: (err) => {
        this.files.update(files =>
          files.map(f =>
            filesToUpload.includes(f.file)
              ? { ...f, status: 'error', progress: 0, message: 'Upload failed' }
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

