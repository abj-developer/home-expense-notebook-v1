
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryUploadService {
  private readonly http = inject(HttpClient);

  private readonly cloudName = 'ettscqmf';
  private readonly uploadPreset = 'expense_receipts';

  uploadImage(file: File): Observable<string> {
    const body = new FormData();

    body.append('file', file);
    body.append('upload_preset', this.uploadPreset);

    return this.http
      .post<CloudinaryUploadResponse>(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        body
      )
      .pipe(map(response => response.secure_url));
  }
}