import { jsPDF } from 'jspdf';

export const exportQuizToPDF = (quiz) => {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    alert("Cannot export empty quiz.");
    return;
  }

  // Create a new PDF document (Portrait, A4 size)
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  
  let currentY = margin;

  // Helper to add lines and manage page breaks
  const addText = (text, size, isBold, color = '#000000', indent = 0) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);

    // Process text and split into lines
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    const lineHeight = size * 1.2; // Standard line height
    const blockHeight = lines.length * lineHeight;
    
    // Check if we need a page break BEFORE printing the first line
    if (currentY + blockHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    
    // We need to draw the text starting at currentY + size (since text baseline is used)
    doc.text(lines, margin + indent, currentY + size);
    
    currentY += blockHeight + (size * 0.5); // Add some padding after the block
  };

  // --- Title Page / Worksheet Header ---
  addText(quiz.title, 22, true, '#4f46e5');
  addText(`Date Generated: ${new Date(quiz.created_at).toLocaleDateString()}`, 11, false, '#666666');
  addText(`Student Name: ___________________________`, 11, false);
  currentY += 20;

  // --- Print Worksheet Questions ---
  quiz.questions.forEach((q, index) => {
    // Exclude flashcards from the printable worksheet
    if (q.question_type === 'FLASHCARD') return;

    // Question
    addText(`${index + 1}. ${q.text}`, 13, true);

    // Choices
    if (q.choices && q.choices.length > 0) {
      const isTrueFalse = q.question_type === 'TRUE_FALSE';
      const labels = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];
      
      q.choices.forEach((choice, cIndex) => {
        const prefix = isTrueFalse ? "▢ " : labels[cIndex] + " ";
        addText(`${prefix} ${choice.text}`, 11, false, '#333333', 25);
      });
    } else {
        // Space for writing
        currentY += 30;
    }
    currentY += 10; // Space between questions
  });

  // --- Answer Key Page ---
  doc.addPage();
  currentY = margin;
  addText("Answer Key", 22, true, '#4f46e5');
  currentY += 20;

  quiz.questions.forEach((q, index) => {
    if (q.question_type === 'FLASHCARD') return;
    
    // Question text reference
    addText(`${index + 1}. ${q.text}`, 10, true, '#666666');
    
    // Correct answers
    const correctChoices = q.choices ? q.choices.filter(c => c.is_correct) : [];
    
    if (correctChoices.length > 0) {
        const answerText = correctChoices.map(c => c.text).join(' AND ');
        addText(`Answer: ${answerText}`, 11, true, '#16a34a', 20);
    } else {
        addText(`Answer: [Check Document Content]`, 11, true, '#b91c1c', 20);
    }
    
    // Add explanation
    if (q.explanation) {
        addText(`Explanation: ${q.explanation}`, 9, false, '#444444', 20);
    }
    
    currentY += 12;
  });

  // Download
  const filename = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_worksheet.pdf`;
  doc.save(filename);
};
