import { getCertificateData } from '../services/storage';
import { downloadCertificatePDF } from '../utils/pdfGenerator';

export default function CertificateModal({ course, user, onClose }) {
  if (!course || !user) return null;

  const certData = getCertificateData(user.email, course.id) || {
    studentName: user.fullname,
    courseTitle: course.title || course.name,
    domain: course.domain || course.category || 'General',
    instructor: course.instructor || 'Dr. Sarah Jenkins',
    completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: `EP-${(course.domain || 'EP').slice(0, 2).toUpperCase()}-849102`
  };

  const handleDownload = () => {
    downloadCertificatePDF(certData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide certificate-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header cert-modal-header">
          <div>
            <p className="modal-title">Official Certificate of Completion</p>
            <p className="modal-subtitle">EduPortal Academic Verification System</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body cert-modal-body">
          <div className="certificate-preview-frame">
            <div className="cert-border-outer">
              <div className="cert-border-inner">
                <div className="cert-brand">EDUPORTAL ACADEMIC SYSTEM</div>
                <div className="cert-main-title">CERTIFICATE OF COMPLETION</div>
                <div className="cert-sub-statement">This is to certify that</div>
                <div className="cert-student-name">{certData.studentName}</div>
                <div className="cert-completion-text">
                  has successfully completed all 5 units, assessments, and required coursework in
                </div>
                <div className="cert-course-name">{certData.courseTitle}</div>
                <div className="cert-domain-badge">Domain: {certData.domain}</div>

                <div className="cert-meta-grid">
                  <div>
                    <span className="cert-meta-label">Completion Date</span>
                    <span className="cert-meta-val">{certData.completionDate}</span>
                  </div>
                  <div>
                    <span className="cert-meta-label">Certificate ID</span>
                    <span className="cert-meta-val">{certData.certificateId}</span>
                  </div>
                </div>

                <div className="cert-footer-row">
                  <div className="cert-sig-block">
                    <div className="cert-sig-line">{certData.instructor}</div>
                    <span className="cert-sig-role">Lead Course Instructor</span>
                  </div>
                  <div className="cert-seal">
                    <span className="seal-text">VERIFIED</span>
                    <span className="seal-sub">EduPortal</span>
                  </div>
                  <div className="cert-sig-block">
                    <div className="cert-sig-line">Dr. Sarah Jenkins</div>
                    <span className="cert-sig-role">Director of Academic Affairs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer cert-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-action btn-gold btn-lg" onClick={handleDownload}>
            📥 Download Certificate (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
