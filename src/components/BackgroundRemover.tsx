'use client'
import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import Image from "next/image";
import Dropzone from 'react-dropzone';
import removeBackground, { ImageSource } from '@imgly/background-removal';

const bgRemovalCallbacks = {} as {
  setRemoveBgStatus: (val: string) => void;
  setBgRemoved: (val: boolean) => void;
  setShowBgRemovalProgress: (val: boolean) => void;
  setBgRemovalProgress: (val: number) => void;
}

let removalInProgress = false;
let hqModelLoaded = false;

const removeBackgroundInImageFile = async(
  selectedFile: any,
  setRemoveBgStatus: (val: string) => void,
  setBgRemoved: (val: boolean) => void,
  setShowBgRemovalProgress: (val: boolean) => void,
  setBgRemovalProgress: (val: number) => void,
  forceHighQuality?: boolean,
) => {
  if (removalInProgress) return;

  removalInProgress = true;

  bgRemovalCallbacks.setRemoveBgStatus = setRemoveBgStatus;
  bgRemovalCallbacks.setBgRemoved = setBgRemoved;
  bgRemovalCallbacks.setShowBgRemovalProgress = setShowBgRemovalProgress;
  bgRemovalCallbacks.setBgRemovalProgress = setBgRemovalProgress;

  bgRemovalCallbacks.setRemoveBgStatus('');
  bgRemovalCallbacks.setBgRemoved(false);

  let startTime = new Date();
  let model: "small" | "medium" | undefined = 'medium';
  if (forceHighQuality) model = 'medium';
  if (hqModelLoaded) model = 'medium';

  console.log('start removing background using', model, 'model');

  let imageBlob;
  try {
    imageBlob = await removeBackground(selectedFile as ImageSource, {
      model: model,
      publicPath: location.protocol + '//' + location.host + '/automatic-background-remover/bg-removal-data/',
      progress: (key, current, total) => {
        if (key.startsWith('fetch:')) {
          bgRemovalCallbacks.setShowBgRemovalProgress(true);
          bgRemovalCallbacks.setBgRemovalProgress((current/total) * 100);
          console.log('Fetching background remover module. This may take a while on the first time...')
          bgRemovalCallbacks.setRemoveBgStatus(`Downloading neural net...`)
        } else if (key.startsWith('compute:inference')) {
          bgRemovalCallbacks.setShowBgRemovalProgress(false);
          console.log('Removing background...');
          bgRemovalCallbacks.setRemoveBgStatus(`Removing background...`);
        }
      }
    });
  } catch (error) {
    bgRemovalCallbacks.setBgRemoved(false);
    console.error(error);
    removalInProgress = false;
    return;
  }

  bgRemovalCallbacks.setRemoveBgStatus('');
  bgRemovalCallbacks.setBgRemoved(true);
  let endTime = new Date();
  const diffTime = Math.abs((endTime as any) - (startTime as any));
  console.log('background removed in', diffTime/1000);
  removalInProgress = false;
  if (model === 'medium') hqModelLoaded = true;
  return URL.createObjectURL(imageBlob);
}


export default function BackgroundRemover(props: {
  className: string|undefined;
}) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string|undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File|undefined>(undefined);
  const [showUploader, setShowUploader] = useState(true);
  const [isRemovingBG, setIsRemovingBG] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [removeBgStatus, setRemoveBgStatus] = useState('');
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);
  const [showBgRemovalProgress, setShowBgRemovalProgress] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const removeBg = async (selectedFile: any, forceHighQuality?: boolean) => {
    setIsRemovingBG(true);
    const imageUrl = await removeBackgroundInImageFile(
      selectedFile,
      setRemoveBgStatus,
      setBgRemoved,
      setShowBgRemovalProgress,
      setBgRemovalProgress,
      forceHighQuality,
    );
    setIsRemovingBG(false);
    if (imageUrl) {
      if (selectedImageUrl) {
        let newUndoStack = [...undoStack];
        newUndoStack.push(selectedImageUrl);
        setUndoStack(newUndoStack);
      }
      setSelectedImageUrl(imageUrl);
    }
  }

  const removeLogo = () => {
    setSelectedFile(undefined);
    setSelectedImageUrl(undefined);
    setShowUploader(true);
    setUndoStack([]);
  };

  if (showUploader) {
    return (
      <Dropzone
        accept={{
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/webp': ['.webp'],
        }}
        onDrop={(acceptedFiles: any[]) => {
          if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];

            const reader = new FileReader()
            reader.onload = () => {
              const base64Url = reader.result;
              if (base64Url) {
                setSelectedImageUrl(base64Url as string);
              }
            };

            reader.readAsDataURL(file)
            setSelectedFile(file);
            setShowUploader(false);
            setBgRemoved(false);
            setUndoStack([]);
          }
        }}

      >
        {({getRootProps, getInputProps}) => (
            <div className={` ${props.className} flex flex-col items-center justify-center p-5 border-2 border-dashed border-2-[#eee] rounded-sm bg-[#fafafa] text-[#bdbdbd] outline-none transition-all cursor-pointer`} {...getRootProps()}>
              <input {...getInputProps()} />
              <div className="text-center">Click to upload or drag logo here (.png, .jpg or .webp)</div>
            </div>
        )}
      </Dropzone>
    );
  }
  return (
    <div className={`${props.className} relative flex flex-col items-center justify-center`}>
      <div className="flex pb-2">
        <button
          className="mr-4 rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            if (undoStack.length == 0) {
              console.log('removing from original')
              setTimeout(() => {
                if (selectedFile) removeBg(selectedFile);
              }, 0)
            }
            else {
              console.log('removing from previous image')
              setTimeout(() => {
                if (selectedFile) removeBg(selectedImageUrl);
              }, 0)
            }
          }}
          disabled={isRemovingBG}
        >
          Remove Background {(undoStack.length > 0) ? 'Again' : ''}
        </button>
          {(!isRemovingBG && (undoStack.length > 0)) && 
          <button
            aria-label="undo"
            disabled={isRemovingBG}
            onClick={() => {
              if (undoStack.length == 0) return;
              let prevImage = undoStack.pop();
              setUndoStack(undoStack);
              setSelectedImageUrl(prevImage);
            }}
            className="mr-2 rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
          >
            Undo
          </button>}
          {(!isRemovingBG && (undoStack.length > 0)) && 
          <a
            aria-label="save"
            href={selectedImageUrl}
            download="image.png"
            className="rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Save
          </a>}
      </div>
      <div className="relative">
        <div className="checkerboard-bg">
          <img style={{height: 'calc(100vh - 128px)'}} src={selectedImageUrl} alt={selectedFile ? selectedFile?.name : ''} />
        </div>

        {isRemovingBG && <div className="absolute bottom-0 left-0 right-0 bg-slate-50/50 p-2">
          <div className="flex items-center text-black">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>{removeBgStatus ? removeBgStatus : 'Loading...'}</div>
          </div>
        </div>}
      </div>
      <div className="flex pt-2">
        <button
          onClick={() => setShowUploader(true)}
          style={{marginRight: 8}}
          disabled={isRemovingBG}
          className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        >Change</button>
        <button
          onClick={removeLogo}
          disabled={isRemovingBG}
          className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        >Delete</button>
      </div>
    </div>
  );
}
