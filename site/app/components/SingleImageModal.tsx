"use client";

import Modal from "./Modal";
import ModalImage from "./ModalImage";

interface SingleImageModalProps {
  src: string;
  title: string;
}

export default function SingleImageModal({ src, title }: SingleImageModalProps) {
  return (
    <Modal>
      <ModalImage src={src} alt={title} caption={title} className="max-h-[80vh] max-w-[85vw] h-auto w-auto" />
    </Modal>
  );
}
