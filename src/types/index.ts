export interface DicomSeries {
  id: string;
  user_id: string;
  series_name: string;
  body_region: string;
  num_slices: number;
  upload_date: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DicomFile {
  id: string;
  series_id: string;
  file_path: string;
  slice_number: number;
  instance_number: number;
  created_at: string;
}

export type BodyRegion = 'chest' | 'abdomen' | 'upper_abdomen' | 'full_body' | 'human_neck' | 'unknown';

export interface DicomMetadata {
  patientName?: string;
  studyDate?: string;
  modality?: string;
  bodyPartExamined?: string;
  seriesDescription?: string;
  rows?: number;
  columns?: number;
  sliceThickness?: number;
  pixelSpacing?: number[];
}
