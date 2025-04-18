import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import remarkGfm from 'remark-gfm';
import { AlignLeft, AlignRight, Type } from 'lucide-react';

interface TextToolProps {
  initialText?: string;
  initialDirection?: 'ltr' | 'rtl';
  onSave?: (text: string, direction: 'ltr' | 'rtl') => void;
  onClose?: () => void;
}

const TextTool: React.FC<TextToolProps> = ({
  initialText = '',
  initialDirection = 'ltr',
  onSave,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const [text, setText] = useState(initialText);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(initialDirection);
  const [currentInput, setCurrentInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when editing mode is enabled
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Initialize with the initial text if provided
  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleDirectionChange = (newDirection: 'ltr' | 'rtl') => {
    setDirection(newDirection);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // When Ctrl+Enter is pressed, save the text
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (onSave) {
        onSave(text, direction);
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(text, direction);
    }
  };

  return (
    <div className="text-tool bg-white rounded-md shadow-md p-4 max-w-full mx-auto">
      {/* Toolbar */}
      <div className="text-tool-toolbar flex items-center justify-between mb-4 pb-2 border-b">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleEdit}
            className={`p-2 rounded-md ${isEditing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title={isEditing ? "View Mode" : "Edit Mode"}
          >
            <Type size={18} />
          </button>
          
          <div className="border-l h-6 mx-2 border-gray-300"></div>
          
          <button
            onClick={() => handleDirectionChange('ltr')}
            className={`p-2 rounded-md ${direction === 'ltr' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Left to Right"
          >
            <AlignLeft size={18} />
          </button>
          
          <button
            onClick={() => handleDirectionChange('rtl')}
            className={`p-2 rounded-md ${direction === 'rtl' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Right to Left"
          >
            <AlignRight size={18} />
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className={`text-tool-content ${direction === 'rtl' ? 'rtl text-right' : 'ltr text-left'}`} dir={direction}>
        {/* Input Area */}
        {isEditing ? (
          <div className="input-area mb-4">
            <TextareaAutosize
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className={`w-full outline-none border rounded-md p-3 bg-gray-50 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
              dir={direction}
              placeholder={direction === 'rtl' ? "اكتب هنا..." : "Type markdown here..."}
              minRows={5}
              maxRows={15}
            />
            
            <div className="preview mt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Preview:</h4>
              <div className="p-3 border rounded-md bg-white prose max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Force all block elements to inherit the parent's direction
                    p: ({node, ...props}) => <p dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h1: ({node, ...props}) => <h1 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h2: ({node, ...props}) => <h2 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h3: ({node, ...props}) => <h3 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h4: ({node, ...props}) => <h4 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h5: ({node, ...props}) => <h5 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    h6: ({node, ...props}) => <h6 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    ul: ({node, ...props}) => <ul dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    ol: ({node, ...props}) => <ol dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    li: ({node, ...props}) => <li dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                  }}
                >
                  {text || "*Preview will appear here*"}
                </ReactMarkdown>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                <p>Markdown tips:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><code># Heading 1</code> - For main headings</li>
                  <li><code>## Heading 2</code> - For subheadings</li>
                  <li><code>**bold**</code> - For <strong>bold text</strong></li>
                  <li><code>*italic*</code> - For <em>italic text</em></li>
                  <li><code>- Item</code> - For bullet lists</li>
                  <li><code>1. Item</code> - For numbered lists</li>
                  <li><code>[Link text](URL)</code> - For links</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rendered-content p-3 border rounded-md bg-white prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Force all block elements to inherit the parent's direction
                p: ({node, ...props}) => <p dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h1: ({node, ...props}) => <h1 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h2: ({node, ...props}) => <h2 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h3: ({node, ...props}) => <h3 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h4: ({node, ...props}) => <h4 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h5: ({node, ...props}) => <h5 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                h6: ({node, ...props}) => <h6 dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                ul: ({node, ...props}) => <ul dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                ol: ({node, ...props}) => <ol dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                li: ({node, ...props}) => <li dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
                blockquote: ({node, ...props}) => <blockquote dir={direction} style={{textAlign: direction === 'rtl' ? 'right' : 'left'}} {...props} />,
              }}
            >
              {text || "*No content to display*"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextTool; 