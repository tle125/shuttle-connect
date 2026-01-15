import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGenProps {
  value: string;
}

const QRCodeGen: React.FC<QRCodeGenProps> = ({ value }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center">
      <QRCodeSVG value={value} size={200} level="H" />
      <p className="mt-4 text-gray-500 text-sm font-mono">{value.split('-')[0]}...</p>
    </div>
  );
};

export default QRCodeGen;
