import { BodyRegion } from '../types';

const vtkImageData = (window as any).vtk?.Common?.DataModel?.ImageData;
const vtkVolume = (window as any).vtk?.Rendering?.Core?.Volume;
const vtkVolumeMapper = (window as any).vtk?.Rendering?.Core?.VolumeMapper;
const vtkColorTransferFunction = (window as any).vtk?.Rendering?.Core?.ColorTransferFunction;
const vtkPiecewiseFunction = (window as any).vtk?.Common?.DataModel?.PiecewiseFunction;
const vtkRenderer = (window as any).vtk?.Rendering?.Core?.Renderer;
const vtkRenderWindow = (window as any).vtk?.Rendering?.Core?.RenderWindow;
const vtkRenderWindowInteractor = (window as any).vtk?.Rendering?.Core?.RenderWindowInteractor;
const vtkInteractorStyleTrackballCamera = (window as any).vtk?.Interaction?.Style?.InteractorStyleTrackballCamera;
const vtkOpenGLRenderWindow = (window as any).vtk?.Rendering?.OpenGL?.RenderWindow;

export interface VolumeRenderConfig {
  windowWidth: number;
  windowCenter: number;
}

const PRESETS: Record<BodyRegion, VolumeRenderConfig> = {
  chest: { windowWidth: 1500, windowCenter: -600 },
  abdomen: { windowWidth: 350, windowCenter: 40 },
  upper_abdomen: { windowWidth: 350, windowCenter: 40 },
  full_body: { windowWidth: 350, windowCenter: 40 },
  human_neck: { windowWidth: 350, windowCenter: 40 },
  unknown: { windowWidth: 350, windowCenter: 40 }
};

export class VolumeRenderer {
  private renderer: any;
  private renderWindow: any;
  private openglRenderWindow: any;
  private interactor: any;
  private volume: any;

  constructor(container: HTMLElement) {
    this.renderWindow = vtkRenderWindow.newInstance();
    this.renderer = vtkRenderer.newInstance();
    this.renderWindow.addRenderer(this.renderer);

    this.openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
    this.renderWindow.addView(this.openglRenderWindow);
    this.openglRenderWindow.setContainer(container);

    this.interactor = vtkRenderWindowInteractor.newInstance();
    this.interactor.setView(this.openglRenderWindow);
    this.interactor.initialize();
    this.interactor.bindEvents(container);

    const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
    this.interactor.setInteractorStyle(interactorStyle);

    this.renderer.setBackground(0.1, 0.1, 0.1);

    const { width, height } = container.getBoundingClientRect();
    this.openglRenderWindow.setSize(width, height);
  }

  renderVolume(volumeData: Float32Array, dimensions: [number, number, number], bodyRegion: BodyRegion) {
    const imageData = vtkImageData.newInstance();
    imageData.setDimensions(dimensions);
    imageData.setSpacing(1.0, 1.0, 1.0);
    imageData.setOrigin(0.0, 0.0, 0.0);

    const dataArray = imageData.getPointData().getScalars();
    dataArray.setData(volumeData);

    const mapper = vtkVolumeMapper.newInstance();
    mapper.setInputData(imageData);

    const config = PRESETS[bodyRegion];
    const low = config.windowCenter - config.windowWidth / 2;
    const high = config.windowCenter + config.windowWidth / 2;

    const colorTransferFunction = vtkColorTransferFunction.newInstance();
    colorTransferFunction.addRGBPoint(low, 0.0, 0.0, 0.0);
    colorTransferFunction.addRGBPoint(config.windowCenter, 1.0, 0.76, 0.65);
    colorTransferFunction.addRGBPoint(high, 1.0, 1.0, 1.0);

    const opacityFunction = vtkPiecewiseFunction.newInstance();
    opacityFunction.addPoint(low, 0.0);
    opacityFunction.addPoint(config.windowCenter, 0.2);
    opacityFunction.addPoint(high, 1.0);

    this.volume = vtkVolume.newInstance();
    this.volume.setMapper(mapper);
    this.volume.getProperty().setRGBTransferFunction(0, colorTransferFunction);
    this.volume.getProperty().setScalarOpacity(0, opacityFunction);
    this.volume.getProperty().setInterpolationTypeToLinear();
    this.volume.getProperty().setShade(true);

    this.renderer.addVolume(this.volume);
    this.renderer.resetCamera();
    this.renderWindow.render();
  }

  resize() {
    if (this.openglRenderWindow && this.openglRenderWindow.getContainer()) {
      const container = this.openglRenderWindow.getContainer();
      const { width, height } = container.getBoundingClientRect();
      this.openglRenderWindow.setSize(width, height);
      this.renderWindow.render();
    }
  }

  destroy() {
    if (this.interactor) {
      this.interactor.unbindEvents();
    }
    if (this.openglRenderWindow) {
      this.openglRenderWindow.delete();
    }
    if (this.renderWindow) {
      this.renderWindow.delete();
    }
    if (this.renderer) {
      this.renderer.delete();
    }
  }
}
