import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { AppIcon } from './AppIcon';

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB limit

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

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Check size limit: 200 KB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setErrorMessage(`File is ${sizeKb} KB. Maximum allowed size is 200 KB.`);
      // Reset input value so same file can be re-selected if needed
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
          {isVerifiedUploaded ? (
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
});
