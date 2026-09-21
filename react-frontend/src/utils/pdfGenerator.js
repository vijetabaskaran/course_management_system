/**
 * EduPortal — pdfGenerator.js
 * Generates downloadable PDF Certificate using jsPDF.
 */

import { jsPDF } from 'jspdf';

export function downloadCertificatePDF(certData) {
  const {
    studentName = 'Student Name',
    courseTitle = 'Course Title',
    domain = 'General',
    completionDate = new Date().toLocaleDateString(),
    certificateId = 'EP-CERT-000000',
    instructor = 'EduPortal Academic Board'
  } = certData || {};

  // Landscape A4 certificate (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background tint
  doc.setFillColor(248, 245, 238); // #F8F5EE warm academic background
  doc.rect(0, 0, width, height, 'F');

  // Outer Border
  doc.setLineWidth(1.5);
  doc.setDrawColor(140, 115, 88); // #8C7358 Taupe/Brown accent
  doc.rect(8, 8, width - 16, height - 16, 'S');

  // Inner Border
  doc.setLineWidth(0.5);
  doc.setDrawColor(168, 143, 112); // #A88F70
  doc.rect(12, 12, width - 24, height - 24, 'S');

  // Header Logo / Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(63, 53, 44); // #3F352C
  doc.text('EDUPORTAL', width / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 93, 80);
  doc.text('ACADEMIC EXCELLENCE & LEARNING MANAGEMENT SYSTEM', width / 2, 34, { align: 'center' });

  // Divider Line
  doc.setLineWidth(0.4);
  doc.setDrawColor(168, 143, 112);
  doc.line(width / 2 - 50, 38, width / 2 + 50, 38);

  // Certificate Title
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(140, 115, 88);
  doc.text('CERTIFICATE OF COMPLETION', width / 2, 52, { align: 'center' });

  // Recipient Statement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(107, 93, 80);
  doc.text('This is to certify that', width / 2, 66, { align: 'center' });

  // Student Name
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(63, 53, 44);
  doc.text(studentName.toUpperCase(), width / 2, 80, { align: 'center' });

  // Underline for Student Name
  const nameWidth = doc.getTextWidth(studentName.toUpperCase());
  doc.setLineWidth(0.6);
  doc.setDrawColor(140, 115, 88);
  doc.line(width / 2 - Math.max(nameWidth / 2 + 10, 40), 83, width / 2 + Math.max(nameWidth / 2 + 10, 40), 83);

  // Completion statement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(107, 93, 80);
  doc.text('has successfully completed all 5 units and required practical evaluations for', width / 2, 96, { align: 'center' });

  // Course Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(140, 115, 88);
  doc.text(courseTitle, width / 2, 110, { align: 'center' });

  // Domain Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(38, 70, 83);
  doc.text(`Domain: ${domain}`, width / 2, 120, { align: 'center' });

  // Metadata Box (Date & Cert ID)
  doc.setFillColor(240, 234, 224);
  doc.roundedRect(width / 2 - 70, 132, 140, 24, 3, 3, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(216, 195, 165);
  doc.roundedRect(width / 2 - 70, 132, 140, 24, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(63, 53, 44);
  doc.text(`Completion Date: ${completionDate}`, width / 2 - 35, 142, { align: 'center' });
  doc.text(`Certificate ID: ${certificateId}`, width / 2 + 35, 142, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 139, 122);
  doc.text('Verified on EduPortal Authentication Gateway', width / 2, 150, { align: 'center' });

  // Signatures Section
  // Left Signature: Instructor
  doc.setLineWidth(0.4);
  doc.setDrawColor(140, 115, 88);
  doc.line(45, 180, 105, 180);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(63, 53, 44);
  doc.text(instructor, 75, 186, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 93, 80);
  doc.text('Lead Course Instructor', 75, 191, { align: 'center' });

  // Center Badge / Gold Seal
  doc.setFillColor(140, 115, 88);
  doc.circle(width / 2, 178, 12, 'F');
  doc.setFillColor(248, 245, 238);
  doc.circle(width / 2, 178, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(140, 115, 88);
  doc.text('VERIFIED', width / 2, 177, { align: 'center' });
  doc.text('PASS', width / 2, 181, { align: 'center' });

  // Right Signature: Academic Director
  doc.line(width - 105, 180, width - 45, 180);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(63, 53, 44);
  doc.text('Dr. Sarah Jenkins', width - 75, 186, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 93, 80);
  doc.text('Director of Academic Affairs', width - 75, 191, { align: 'center' });

  // Save the PDF file
  const filename = `${studentName.replace(/\s+/g, '_')}_${courseTitle.replace(/\s+/g, '_')}_Certificate.pdf`;
  doc.save(filename);
}
