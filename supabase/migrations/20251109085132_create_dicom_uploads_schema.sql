/*
  # Create DICOM Uploads Schema

  1. New Tables
    - `dicom_series`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `series_name` (text) - User-provided name for the series
      - `body_region` (text) - Detected body region (chest, abdomen, etc.)
      - `num_slices` (integer) - Number of DICOM slices
      - `upload_date` (timestamptz)
      - `metadata` (jsonb) - Store DICOM metadata
      
    - `dicom_files`
      - `id` (uuid, primary key)
      - `series_id` (uuid, references dicom_series)
      - `file_path` (text) - Storage path in Supabase
      - `slice_number` (integer)
      - `instance_number` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create dicom_series table
CREATE TABLE IF NOT EXISTS dicom_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  series_name text NOT NULL,
  body_region text DEFAULT 'unknown',
  num_slices integer DEFAULT 0,
  upload_date timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create dicom_files table
CREATE TABLE IF NOT EXISTS dicom_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES dicom_series(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  slice_number integer DEFAULT 0,
  instance_number integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dicom_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE dicom_files ENABLE ROW LEVEL SECURITY;

-- Policies for dicom_series
CREATE POLICY "Users can view own series"
  ON dicom_series FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own series"
  ON dicom_series FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own series"
  ON dicom_series FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own series"
  ON dicom_series FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for dicom_files
CREATE POLICY "Users can view own files"
  ON dicom_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dicom_series
      WHERE dicom_series.id = dicom_files.series_id
      AND dicom_series.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own files"
  ON dicom_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dicom_series
      WHERE dicom_series.id = dicom_files.series_id
      AND dicom_series.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own files"
  ON dicom_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dicom_series
      WHERE dicom_series.id = dicom_files.series_id
      AND dicom_series.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dicom_series_user_id ON dicom_series(user_id);
CREATE INDEX IF NOT EXISTS idx_dicom_files_series_id ON dicom_files(series_id);
