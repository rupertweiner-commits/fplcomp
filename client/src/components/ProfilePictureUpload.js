import React, { useState, useRef } from 'react';
import { X, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../config/supabase';
const ProfilePictureUpload = ({ userId, currentPicture, onPictureUpdate, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (file) {
      validateAndPreviewFile(file);
    }
  };

  const validateAndPreviewFile = (file) => {
    setError('');
    setSuccess('');

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();

    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const video = cameraRef.current;

          video.srcObject = stream;
          video.play();
        })
        .catch((err) => {
          setError('Camera access denied: ' + err.message);
        });
    } else {
      setError('Camera not available on this device');
    }
  };

  const capturePhoto = () => {
    const video = cameraRef.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });

      validateAndPreviewFile(file);

      // Stop camera stream
      const stream = video.srcObject;

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
    }, 'image/jpeg', 0.8);
  };

  const uploadPicture = async() => {
    if (!previewImage) {
      setError('Please select an image first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    try {
      // Convert base64 to blob
      const response = await fetch(previewImage);
      const blob = await response.blob();
      const fileExt = 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      setSuccess('Profile picture updated successfully!');

      // Update parent component with the public URL
      if (onPictureUpdate) {
        onPictureUpdate(urlData.publicUrl);
      }

      // Reset form
      setPreviewImage(null);

      // Close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removePicture = async() => {
    try {
      // Remove from Supabase Storage if there's a current picture
      if (currentPicture && currentPicture.includes('supabase')) {
        const fileName = currentPicture.split('/').pop();
        const { error: deleteError } = await supabase.storage
          .from('profile-pictures')
          .remove([`profile-pictures/${fileName}`]);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }
      }

      setSuccess('Profile picture removed successfully!');
      if (onPictureUpdate) {
        onPictureUpdate(null);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to remove picture: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Update Profile Picture</h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Picture */}
          {currentPicture && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Current Picture:</p>
              <img
                alt="Current profile"
                className="w-20 h-20 rounded-full mx-auto border-2 border-gray-200"
                src={currentPicture}
              />
            </div>
          )}

          {/* Upload Methods */}
          <div className="space-y-3">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
              <input
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5" />
                <span>Choose from device</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
            </div>

            {/* Camera Capture */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors">
              <button
                className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700"
                onClick={handleCameraCapture}
              >
                <Camera className="w-5 h-5" />
                <span>Take photo</span>
              </button>
            </div>
          </div>

          {/* Camera Preview */}
          {cameraRef.current?.srcObject && (
            <div className="space-y-2">
              <video
                autoPlay
                className="w-full rounded-lg"
                muted
                ref={cameraRef}
              />
              <button
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                onClick={capturePhoto}
              >
                Capture Photo
              </button>
            </div>
          )}

          {/* Image Preview */}
          {previewImage && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Preview:</p>
              <div className="relative">
                <img
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  src={previewImage}
                />
                <button
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Uploading...
                {' '}
                {uploadProgress}
                %
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {currentPicture && (
              <button
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                disabled={isUploading}
                onClick={removePicture}
              >
                Remove Picture
              </button>
            )}

            {previewImage && (
              <button
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={isUploading}
                onClick={uploadPicture}
              >
                {isUploading ? 'Uploading...' : 'Update Picture'}
              </button>
            )}

            <button
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
              disabled={isUploading}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;

