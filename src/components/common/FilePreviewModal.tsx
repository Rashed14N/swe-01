import React from 'react';
import { ResourceDetailModal, ResourceDetailModalProps } from './ResourceDetailModal';

export interface FilePreviewModalProps extends ResourceDetailModalProps {}

/**
 * FilePreviewModal now renders the redesigned, centered ResourceDetailModal
 * maintaining full backwards compatibility across the application.
 */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = (props) => {
  return <ResourceDetailModal {...props} />;
};

export { ResourceDetailModal };
