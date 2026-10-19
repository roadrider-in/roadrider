import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { AppIcon } from './AppIcon';

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB limit
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export const DocumentUploader = ({
  label,
  subtitle,
  document: docProp,
  fileData,
  onUploadSuccess,
  onRemove,
  required = false,
  accept = 'image/*,application/pdf',
  style,
}) => {
  const document = docProp || fileData;
  const fileInputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFileMeta = (name, size, mimeType) => {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    const isAllowedExt = ext && ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = mime && ALLOWED_MIME_TYPES.includes(mime);

    if (!isAllowedExt && !isAllowedMime) {
      return {
        valid: false,
        error: `Unsupported format (${ext || 'unknown'}). Allowed: JPG, PNG, PDF.`,
      };
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      const sizeKb = (size / 1024).toFixed(1);
      return {
        valid: false,
        error: `File is ${sizeKb} KB. Maximum allowed size is 200 KB.`,
      };
    }

    return { valid: true, error: null };
  };

  const processAsset = async (asset, defaultExt = 'jpg') => {
    try {
      setIsProcessing(true);
      setErrorMessage('');

      let name = asset.name || asset.fileName;
      if (!name) {
        name = `proof_${Date.now()}.${defaultExt}`;
      }

      let mimeType = asset.mimeType;
      if (!mimeType) {
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'png') mimeType = 'image/png';
        else mimeType = 'image/jpeg';
      }

      let fileSize = asset.fileSize ?? asset.size;
      let blob = asset.file instanceof Blob ? asset.file : null;

      if (!fileSize || fileSize <= 0 || !blob) {
        try {
          const response = await fetch(asset.uri);
          blob = await response.blob();
          if (blob?.size) {
            fileSize = blob.size;
          }
        } catch (e) {
          console.warn('[DocumentUploader] Fetch local uri failed:', e);
        }
      }

      if (!fileSize || fileSize <= 0) {
        fileSize = 80 * 1024;
      }

      const validation = validateFileMeta(name, fileSize, mimeType);
      if (!validation.valid) {
        setErrorMessage(validation.error);
        setIsProcessing(false);
        return;
      }

      let dataUrl = null;
      if (asset.base64) {
        dataUrl = `data:${mimeType};base64,${asset.base64}`;
      } else if (blob) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(asset.uri);
          reader.readAsDataURL(blob);
        });
      } else {
        dataUrl = asset.uri;
      }

      const sizeStr = `${(fileSize / 1024).toFixed(1)} KB`;
      const uploadedDoc = {
        name,
        size: sizeStr,
        fileSize,
        dataUrl,
        uri: asset.uri,
        type: mimeType,
        file: blob,
        lastModified: Date.now(),
        isNewUpload: true,
      };

      if (onUploadSuccess) {
        onUploadSuccess(uploadedDoc);
      }
    } catch (err) {
      console.warn('[DocumentUploader] Asset processing error:', err);
      setErrorMessage(err.message || 'Failed to process selected file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    setIsActionSheetOpen(false);
    try {
      setErrorMessage('');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processAsset(result.assets[0], 'jpg');
    } catch (err) {
      console.warn('[DocumentUploader] Camera error:', err);
      setErrorMessage(err.message || 'Error opening camera.');
    }
  };

  const handleChooseFromGallery = async () => {
    setIsActionSheetOpen(false);
    try {
      setErrorMessage('');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processAsset(result.assets[0], 'jpg');
    } catch (err) {
      console.warn('[DocumentUploader] Gallery error:', err);
      setErrorMessage(err.message || 'Error opening gallery.');
    }
  };

  const handleBrowseFiles = async () => {
    setIsActionSheetOpen(false);
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    try {
      setErrorMessage('');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processAsset(result.assets[0], 'pdf');
    } catch (err) {
      console.warn('[DocumentUploader] Document picker error:', err);
      setErrorMessage(err.message || 'Error opening file browser.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validation = validateFileMeta(file.name, file.size, file.type);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      e.target.value = '';
      return;
    }

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      const uploadedDoc = {
        name: file.name,
        size: sizeStr,
        fileSize: file.size,
        dataUrl,
        type: file.type,
        file,
        lastModified: Date.now(),
        isNewUpload: true,
      };
      if (onUploadSuccess) {
        onUploadSuccess(uploadedDoc);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = () => {
    setErrorMessage('');
    setIsActionSheetOpen(true);
  };

  const imageUrl = document?.dataUrl || document?.signedUrl || document?.publicUrl || document?.url;

  useEffect(() => {
    setImageLoadError(false);
  }, [imageUrl]);

  const isUploaded = Boolean(document && (imageUrl || document.name || document.storagePath));
  const isVerifiedUploaded = isUploaded && !imageLoadError;
  const isPdf = document?.type === 'application/pdf' || (document?.name && document.name.toLowerCase().endsWith('.pdf'));
  const isImage = !isPdf && Boolean(
    document?.type?.startsWith('image/') ||
    imageUrl?.startsWith('data:image/') ||
    imageUrl?.startsWith('http://') ||
    imageUrl?.startsWith('https://') ||
    (document?.name && /\.(jpe?g|png|webp|gif|svg)$/i.test(document.name))
  );

  return (
    <View style={[styles.container, style]}>
      {/* Hidden Web File Input */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      {/* Action Sheet Modal */}
      <Modal
        visible={isActionSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsActionSheetOpen(false)} />
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHandle} />
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>Select Document Source</Text>
              <Text style={styles.actionSheetSubtitle}>Upload JPG, PNG or PDF (Max 200 KB)</Text>
            </View>

            <View style={styles.actionSheetOptions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionSheetItem}
                onPress={handleTakePhoto}
              >
                <View style={styles.actionIconCircle}>
                  <AppIcon name="camera" size={20} color={colors.terracotta} />
                </View>
                <View style={styles.actionItemTextCol}>
                  <Text style={styles.actionItemTitle}>Take Photo</Text>
                  <Text style={styles.actionItemSub}>Use your camera to capture proof</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionSheetItem}
                onPress={handleChooseFromGallery}
              >
                <View style={styles.actionIconCircle}>
                  <AppIcon name="image" size={20} color={colors.terracotta} />
                </View>
                <View style={styles.actionItemTextCol}>
                  <Text style={styles.actionItemTitle}>Choose from Gallery</Text>
                  <Text style={styles.actionItemSub}>Pick an existing photo</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionSheetItem}
                onPress={handleBrowseFiles}
              >
                <View style={styles.actionIconCircle}>
                  <AppIcon name="file" size={20} color={colors.terracotta} />
                </View>
                <View style={styles.actionItemTextCol}>
                  <Text style={styles.actionItemTitle}>Browse Files</Text>
                  <Text style={styles.actionItemSub}>Select document or PDF file</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelButton}
              onPress={() => setIsActionSheetOpen(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.card, isVerifiedUploaded && styles.cardUploaded, (errorMessage || imageLoadError) && styles.cardError]}>
        {/* Left icon / preview */}
        <View style={styles.previewBox}>
          {isVerifiedUploaded && isImage && imageUrl && !imageLoadError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={[styles.iconWrapper, isVerifiedUploaded && styles.iconWrapperUploaded]}>
              <AppIcon
                name={isVerifiedUploaded ? 'check' : 'upload'}
                size={20}
                color={isVerifiedUploaded ? colors.white : colors.charcoal}
              />
              {isVerifiedUploaded && isPdf && (
                <View style={styles.pdfTag}>
                  <Text style={styles.pdfTagText}>PDF</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Text details */}
        <View style={styles.infoCol}>
          <View style={styles.labelRow}>
            <Text style={styles.titleText}>{label}</Text>
          </View>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {imageLoadError
              ? 'File inaccessible or link expired. Please re-upload.'
              : isVerifiedUploaded
              ? `${document.name || 'Document uploaded'} • ${document.size || 'Uploaded'}`
              : subtitle || 'Max size 200 KB (JPG, PNG, PDF)'}
          </Text>
        </View>

        {/* Action button */}
        <View style={styles.actionsRow}>
          {isProcessing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.terracotta} />
            </View>
          ) : isVerifiedUploaded ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.replaceBtn}
                onPress={triggerUpload}
              >
                <Text style={styles.replaceBtnText}>Replace</Text>
              </TouchableOpacity>
              {onRemove && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.removeBtn}
                  onPress={() => {
                    setErrorMessage('');
                    onRemove();
                  }}
                >
                  <AppIcon name="close" size={14} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.uploadBtn}
              onPress={triggerUpload}
            >
              <AppIcon name="upload" size={14} color={colors.white} />
              <Text style={styles.uploadBtnText}>{imageLoadError ? 'Re-upload' : 'Upload'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error message */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <AppIcon name="close" size={12} color={colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    width: '100%',
    maxWidth: '100%',
  },
  cardUploaded: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  cardError: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  previewBox: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radius.input,
    resizeMode: 'cover',
  },
  iconWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperUploaded: {
    backgroundColor: '#10B981',
  },
  pdfTag: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#047857',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  pdfTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
  },
  infoCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  titleText: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
    flexShrink: 1,
  },
  requiredBadge: {
    fontSize: 9,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.terracotta,
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBox: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.button,
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.white,
  },
  replaceBtn: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.button,
  },
  replaceBtnText: {
    fontSize: 11,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.charcoal,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.danger,
    fontWeight: '500',
  },
  // Modal / Action Sheet Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetHeader: {
    marginBottom: 18,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.heading,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  actionSheetOptions: {
    gap: 10,
    marginBottom: 16,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    gap: 14,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(163, 94, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemTextCol: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 14,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 2,
  },
  actionItemSub: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  cancelButton: {
    paddingVertical: 13,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.charcoal,
  },
});
