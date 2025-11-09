import dicomParser from 'dicom-parser';
import { BodyRegion, DicomMetadata } from '../types';

export function parseDicomFile(arrayBuffer: ArrayBuffer): DicomMetadata {
  try {
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const metadata: DicomMetadata = {
      patientName: getStringValue(dataSet, 'x00100010'),
      studyDate: getStringValue(dataSet, 'x00080020'),
      modality: getStringValue(dataSet, 'x00080060'),
      bodyPartExamined: getStringValue(dataSet, 'x00180015'),
      seriesDescription: getStringValue(dataSet, 'x0008103e'),
      rows: getNumberValue(dataSet, 'x00280010'),
      columns: getNumberValue(dataSet, 'x00280011'),
      sliceThickness: getNumberValue(dataSet, 'x00180050'),
    };

    const pixelSpacing = getStringValue(dataSet, 'x00280030');
    if (pixelSpacing) {
      metadata.pixelSpacing = pixelSpacing.split('\\').map(Number);
    }

    return metadata;
  } catch (error) {
    console.error('Error parsing DICOM:', error);
    return {};
  }
}

function getStringValue(dataSet: any, tag: string): string | undefined {
  try {
    const element = dataSet.elements[tag];
    if (element) {
      return dataSet.string(tag);
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
}

function getNumberValue(dataSet: any, tag: string): number | undefined {
  try {
    const element = dataSet.elements[tag];
    if (element) {
      const value = dataSet.string(tag);
      return value ? parseFloat(value) : undefined;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
}

export function detectBodyRegion(metadata: DicomMetadata, seriesName: string): BodyRegion {
  const searchText = `${metadata.bodyPartExamined || ''} ${metadata.seriesDescription || ''} ${seriesName}`.toLowerCase();

  if (searchText.includes('chest') || searchText.includes('thorax') || searchText.includes('lung')) {
    return 'chest';
  } else if (searchText.includes('upper abdomen') || searchText.includes('upper_abdomen')) {
    return 'upper_abdomen';
  } else if (searchText.includes('abdomen') || searchText.includes('abdominal')) {
    return 'abdomen';
  } else if (searchText.includes('neck') || searchText.includes('cervical')) {
    return 'human_neck';
  } else if (searchText.includes('full body') || searchText.includes('whole body')) {
    return 'full_body';
  }

  return 'unknown';
}

export function getPixelData(arrayBuffer: ArrayBuffer): Uint16Array | null {
  try {
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const pixelDataElement = dataSet.elements.x7fe00010;
    if (!pixelDataElement) {
      return null;
    }

    const rows = getNumberValue(dataSet, 'x00280010') || 0;
    const columns = getNumberValue(dataSet, 'x00280011') || 0;

    const pixelData = new Uint16Array(
      dataSet.byteArray.buffer,
      pixelDataElement.dataOffset,
      pixelDataElement.length / 2
    );

    return pixelData.slice(0, rows * columns);
  } catch (error) {
    console.error('Error extracting pixel data:', error);
    return null;
  }
}
