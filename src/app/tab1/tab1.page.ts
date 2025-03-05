import { Component, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Camera, CameraOptions } from '@awesome-cordova-plugins/camera/ngx';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false
})
export class Tab1Page implements AfterViewInit {
  capturedPic: string = '';
  croppingMode: boolean = false;
  cropStartX: number = 0;
  cropStartY: number = 0;
  cropEndX: number = 0;
  cropEndY: number = 0;
  isDragging: boolean = false;

  @ViewChild('imageCanvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('croppingPreview', { static: false }) previewImg!: ElementRef<HTMLImageElement>;

  originalImage = new Image();

  // Variables to track which border is being resized
  resizeTop = false;
  resizeBottom = false;
  resizeLeft = false;
  resizeRight = false;

  constructor(private camera: Camera, private zone: NgZone) {
    const storedImage = localStorage.getItem("Brows");
    this.capturedPic = storedImage !== null ? storedImage : '';
  }

  ngAfterViewInit(): void {
    // Canvas is available after view init
  }

  takePicture() {
    const options: CameraOptions = {
      destinationType: this.camera.DestinationType.DATA_URL,
      sourceType: this.camera.PictureSourceType.CAMERA,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true
    };

    this.camera.getPicture(options).then((imageData) => {
      this.zone.run(() => {
        this.capturedPic = imageData;
        console.log("CAPTURED",imageData);
        
        localStorage.setItem("Brows", this.capturedPic);
      });
    }).catch(err => {
      console.error("Camera error:", err);
    });
  }

  startCropping() {
    this.croppingMode = true;

    // We need to wait for the DOM to update
    setTimeout(() => {
      if (!this.canvas) return;

      const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
      const ctx = canvasEl.getContext('2d');

      if (!ctx) {
        console.error("Could not get canvas context");
        return;
      }

      this.originalImage.onload = () => {
        // Set canvas dimensions to match the image
        canvasEl.width = this.originalImage.width;
        canvasEl.height = this.originalImage.height;

        // Draw image on canvas
        ctx.drawImage(this.originalImage, 0, 0);

        // Initialize crop area to center 80% of the image
        this.cropStartX = this.originalImage.width * 0.1;
        this.cropStartY = this.originalImage.height * 0.1;
        this.cropEndX = this.originalImage.width * 0.9;
        this.cropEndY = this.originalImage.height * 0.9;

        this.drawCropBox(ctx);
      };

      this.originalImage.src = this.capturedPic;
    }, 100);
  }

  onCanvasMouseDown(event: MouseEvent) {
    if (!this.croppingMode || !this.canvas) return;

    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    const rect = canvasEl.getBoundingClientRect();

    // Get mouse position relative to canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if the click is near the crop box borders
    if (this.isNearCropBoxEdge(x, y)) {
      this.isDragging = true;
      // Store which border the user clicked on
      this.determineResizeDirection(x, y);
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (!this.croppingMode || !this.isDragging || !this.canvas) return;

    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    const rect = canvasEl.getBoundingClientRect();

    // Get mouse position relative to canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update crop box based on drag
    this.updateCropBox(x, y);

    // Redraw
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(this.originalImage, 0, 0);
    this.drawCropBox(ctx);
  }

  onCanvasMouseUp() {
    this.isDragging = false;
    this.updatePreview();
  }

  isNearCropBoxEdge(x: number, y: number): boolean {
    const threshold = 20; // Pixels

    // Check if point is near any edge of the crop box
    return (
      (Math.abs(x - this.cropStartX) < threshold && y >= this.cropStartY && y <= this.cropEndY) || // Left edge
      (Math.abs(x - this.cropEndX) < threshold && y >= this.cropStartY && y <= this.cropEndY) || // Right edge
      (Math.abs(y - this.cropStartY) < threshold && x >= this.cropStartX && x <= this.cropEndX) || // Top edge
      (Math.abs(y - this.cropEndY) < threshold && x >= this.cropStartX && x <= this.cropEndX) // Bottom edge
    );
  }

  determineResizeDirection(x: number, y: number) {
    // Store which border(s) the user clicked near
    this.resizeTop = Math.abs(y - this.cropStartY) < 20;
    this.resizeBottom = Math.abs(y - this.cropEndY) < 20;
    this.resizeLeft = Math.abs(x - this.cropStartX) < 20;
    this.resizeRight = Math.abs(x - this.cropEndX) < 20;
  }

  updateCropBox(x: number, y: number) {
    // Update the appropriate borders based on drag direction
    if (this.resizeLeft) this.cropStartX = Math.min(x, this.cropEndX - 50);
    if (this.resizeRight) this.cropEndX = Math.max(x, this.cropStartX + 50);
    if (this.resizeTop) this.cropStartY = Math.min(y, this.cropEndY - 50);
    if (this.resizeBottom) this.cropEndY = Math.max(y, this.cropStartY + 50);
  }

  drawCropBox(ctx: CanvasRenderingContext2D) {
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Clear the crop box area
    ctx.clearRect(this.cropStartX, this.cropStartY,
      this.cropEndX - this.cropStartX,
      this.cropEndY - this.cropStartY);

    // Draw crop box border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.cropStartX, this.cropStartY,
      this.cropEndX - this.cropStartX,
      this.cropEndY - this.cropStartY);

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = 'white';

    // Top-left
    ctx.fillRect(this.cropStartX - handleSize / 2, this.cropStartY - handleSize / 2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(this.cropEndX - handleSize / 2, this.cropStartY - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(this.cropStartX - handleSize / 2, this.cropEndY - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(this.cropEndX - handleSize / 2, this.cropEndY - handleSize / 2, handleSize, handleSize);
  }

  updatePreview() {
    if (!this.canvas || !this.previewImg) return;

    const previewCanvas = document.createElement('canvas');
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions of the cropped area
    const width = this.cropEndX - this.cropStartX;
    const height = this.cropEndY - this.cropStartY;

    previewCanvas.width = width;
    previewCanvas.height = height;

    // Draw only the cropped portion
    ctx.drawImage(
      this.originalImage,
      this.cropStartX, this.cropStartY, width, height,
      0, 0, width, height
    );

    // Update preview
    this.previewImg.nativeElement.src = previewCanvas.toDataURL('image/jpeg');
  }

  applyCrop() {
    if (!this.canvas) return;

    const previewCanvas = document.createElement('canvas');
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions of the cropped area
    const width = this.cropEndX - this.cropStartX;
    const height = this.cropEndY - this.cropStartY;

    previewCanvas.width = width;
    previewCanvas.height = height;

    // Draw only the cropped portion
    ctx.drawImage(
      this.originalImage,
      this.cropStartX, this.cropStartY, width, height,
      0, 0, width, height
    );

    // Get base64 of cropped image (remove data:image/jpeg;base64, prefix)
    const base64Cropped = previewCanvas.toDataURL('image/jpeg').split(',')[1];

    // Save cropped image
    this.capturedPic = "data:image/jpeg;base64,"+base64Cropped;
    localStorage.setItem("Brows", this.capturedPic);

    // Exit cropping mode
    this.croppingMode = false;
  }

  cancelCrop() {
    this.croppingMode = false;
  }

  resetImage() {
    this.capturedPic = '';
    localStorage.removeItem("Brows");
  }
}