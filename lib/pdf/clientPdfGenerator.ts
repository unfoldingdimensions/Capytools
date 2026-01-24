
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a visual PDF from a DOM element
 * This captures the element as an image and puts it into a PDF
 */
export async function generateVisualPdf(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with ID ${elementId} not found`);
    }

    try {
        // Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better resolution
            useCORS: true, // Allow loading cross-origin images
            logging: false,
            backgroundColor: '#ffffff', // Ensure white background
        });

        const imgData = canvas.toDataURL('image/png');

        // Calculate dimensions
        // A4 size in mm: 210 x 297
        const pdfWidth = 210;
        const pdfHeight = 297;

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add subsequent pages if content overflows
        while (heightLeft > 0) {
            position = heightLeft - imgHeight; // Top position for next page
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        doc.save(filename);
    } catch (error) {
        console.error('Visual PDF generation failed:', error);
        throw new Error('Failed to generate visual PDF');
    }
}
