/**
 * Shared Content Input step component.
 * Used by both ProjectCreator (Step 3) and EpisodeCreator (Step 1).
 */
import { useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { FileText, X, Upload } from 'lucide-react';

interface ContentInputStepProps {
  textContent: string;
  onTextChange: (value: string) => void;
  uploadedFiles: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  isDragging: boolean;
  onDragStateChange: (dragging: boolean) => void;
  /** Optional: placeholder text override */
  placeholder?: string;
  /** Optional: keyboard handler for the textarea */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ContentInputStep({
  textContent,
  onTextChange,
  uploadedFiles,
  onFilesAdded,
  onFileRemoved,
  isDragging,
  onDragStateChange,
  placeholder,
  onKeyDown,
}: ContentInputStepProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files));
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files));
    }
  };

  const defaultPlaceholder = language === 'zh'
    ? '粘贴或输入您的内容...\n\n例如：书籍章节、故事文本、播客脚本等'
    : 'Paste or enter your content...\n\nExample: Book chapter, story text, podcast script, etc.';

  return (
    <div className="space-y-6">
      <div>
        <div
          className={`relative rounded-xl border transition-all ${
            isDragging
              ? 'border-t-border bg-t-card-hover'
              : 'border-t-border bg-t-card'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <textarea
            value={textContent}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder || defaultPlaceholder}
            rows={8}
            className="w-full px-5 pt-4 pb-3 bg-transparent text-base text-t-text1 placeholder-t-text3 focus:outline-none resize-none"
          />

          {/* Attachment Area */}
          <div className="px-5 pb-4 pt-2 border-t border-t-border-lt">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx"
              multiple
              className="hidden"
            />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-t-border"
                    style={{ background: `${theme.primary}10` }}
                  >
                    <FileText size={16} style={{ color: theme.primaryLight }} />
                    <span className="flex-1 text-sm text-t-text1 truncate">{file.name}</span>
                    <span className="text-xs text-t-text3">{(file.size / 1024).toFixed(1)}KB</span>
                    <button
                      onClick={() => onFileRemoved(index)}
                      className="p-1 rounded hover:bg-t-card-hover text-t-text3 hover:text-red-400 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-t-text3 hover:text-t-text2 hover:bg-t-card transition-all"
            >
              <Upload size={16} />
              <span>
                {isDragging
                  ? (language === 'zh' ? '放开以上传' : 'Drop to upload')
                  : (language === 'zh' ? '点击上传 TXT、PDF 或 Word 文件' : 'Click to upload TXT, PDF or Word file')}
              </span>
            </button>
          </div>

          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-t-card backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-t-text2">
                <Upload size={36} />
                <span className="text-base font-medium">
                  {language === 'zh' ? '放开以上传' : 'Drop to upload'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
