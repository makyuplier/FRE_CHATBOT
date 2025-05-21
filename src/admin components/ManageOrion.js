// src/admin/components/ManageOrion.js
import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../Firebase";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.entry";
import { Upload, Edit, Trash2 } from "react-feather";
import { BiSolidMagicWand } from "react-icons/bi";
import {
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaTimes,
  FaFolderOpen,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "../styles/admin/ManageOrion.css";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const ManageOrion = () => {
  const [title, setTitle] = useState("");
  const [contentFile, setContentFile] = useState(null);
  const [questionsFile, setQuestionsFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [titlePlaceholder, setTitlePlaceholder] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [editDoc, setEditDoc] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editQuestions, setEditQuestions] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    // Fetch documents from Firestore when the component mounts
    const fetchDocuments = async () => {
      const docRef = collection(db, "knowledge");
      const querySnapshot = await getDocs(docRef);
      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(docs);
    };
    fetchDocuments();
  }, []);

  const handleEdit = (docId) => {
    const docToEdit = documents.find((doc) => doc.id === docId);
    if (docToEdit) {
      setEditDoc(docToEdit);
      setEditContent(docToEdit.content);
      setEditQuestions(docToEdit.questions);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    try {
      if (!editContent.trim() || !editQuestions.trim()) {
        Swal.fire({
          title: "Missing Content",
          text: "Both content and questions must be filled out before saving.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }
  
      const docRef = doc(db, "knowledge", editDoc.id);
      await setDoc(docRef, {
        content: editContent,
        questions: editQuestions,
        uploadedAt: new Date().toISOString(),
      });
  
// 1. Parse old and new questions
const oldQuestions = (editDoc.questions || "")
  .split("?")
  .map((q) => q.trim())
  .filter((q) => q.length > 0);

const newQuestions = editQuestions
  .split("?")
  .map((q) => q.trim())
  .filter((q) => q.length > 0);

// 2. Fetch current Firestore question data
const chartDocRef = doc(db, "dashboard/pie chart/questions", editDoc.id);
const prevSnap = await getDoc(chartDocRef);
const prevData = prevSnap.exists() ? prevSnap.data() : {};

// 3. Preserve counts by index position
const updatedData = {};
newQuestions.forEach((q, i) => {
  const key = `${q}?`;
  const oldQ = oldQuestions[i];
  const oldKey = oldQ ? `${oldQ}?` : null;

  // Try to preserve old count if position matches
  updatedData[key] = oldKey && prevData[oldKey] !== undefined ? prevData[oldKey] : 0;
});

// 4. Preserve 'other questions'
updatedData["other questions"] = prevData["other questions"] ?? 0;

// 5. Write updated questions map
await setDoc(chartDocRef, updatedData);


      setIsEditing(false);
      Swal.fire({
        title: "Document updated successfully!",
        icon: "success",
        confirmButtonText: "OK",
      });
  
      setUploading(true);
  
      const docSnapshot = await getDocs(collection(db, "knowledge"));
      const newDocs = docSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(newDocs);
      setEditDoc(null);
    } catch (err) {
      console.error("Error updating document:", err);
      Swal.fire({
        title: "Error",
        text: "There was an error updating the document.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setUploading(false);
    }
  };
  
  // const handleCancelEdit = () => {
  //   setEditDoc(null); // Close the editing modal without saving
  // };

  const getFileIcon = (file) => {
    if (!file) return null;
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "pdf")
      return <FaFilePdf size={16} color="red" style={{ marginRight: 6 }} />;
    if (["docx", "doc"].includes(ext))
      return <FaFileWord size={16} color="blue" style={{ marginRight: 6 }} />;
    if (ext === "txt")
      return (
        <FaFileAlt size={16} color="lightblue" style={{ marginRight: 6 }} />
      );

    return <FaFileAlt size={16} style={{ marginRight: 6 }} />;
  };

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  // const getFileDetails = (file) => {
  //   if (!file) return null;
  //   const fileSize = formatFileSize(file.size);
  //   const fileType = file.type || "Unknown type";
  //   return `${fileSize} | ${fileType}`;
  // };

  const isValidFileType = (file) => {
    const allowedExtensions = ["pdf", "docx", "txt"];
    const ext = file.name.split(".").pop().toLowerCase();
    return allowedExtensions.includes(ext);
  };

  const handleFileDrop = (type) => (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      Swal.fire({
        title: "Invalid File Type",
        text: "Only PDF, DOCX, or TXT files are allowed. DOC files are currently unsupported.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    if (type === "content") {
      setContentFile(file);
      if (!title) setTitlePlaceholder(file.name.replace(/\.[^/.]+$/, ""));
    } else if (type === "questions") {
      setQuestionsFile(file);
    }
  };

  const handleManualFilePick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset the input value so that re-uploading the same file triggers onChange again
    e.target.value = null;

    if (!isValidFileType(file)) {
      Swal.fire({
        title: "Invalid File Type",
        text: "Only PDF, DOCX, or TXT files are allowed. DOC files are currently unsupported.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const { isConfirmed, isDismissed } = await Swal.fire({
      title: "Select File Purpose",
      text: "Should this file be used as the Content file?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Use as Content",
      cancelButtonText: "Use as Questions",
      customClass: {
        popup: "zindex-fix",
        container: "zindex-fix-container",
      },
    });

    if (isConfirmed) {
      setContentFile(file);
      if (!title) setTitlePlaceholder(file.name.replace(/\.[^/.]+$/, ""));
    } else if (isDismissed) {
      setQuestionsFile(file);
    }
  };

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete the document titled "${id}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete it!",
      cancelButtonText: "Cancel",
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "knowledge", id));
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
        Swal.fire({
          title: `"${id}" deleted successfully.`,
          icon: "success",
          confirmButtonText: "OK",
        });
      } catch (err) {
        console.error("Delete failed:", err);
        Swal.fire({
          title: "Delete failed.",
          text: "An error occurred while deleting the document.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      text += strings.join(" ") + "\n";
    }
    return text.trim();
  };

  const extractTextFromWord = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  };

  const extractTextFromTxt = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.trim());
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const extractTextFromFile = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "pdf") return await extractTextFromPDF(file);
    if (ext === "docx") return await extractTextFromWord(file);
    if (ext === "doc") {
      throw new Error(
        "DOC files are not supported. Please convert your file to DOCX format and try again."
      );
    }
    if (ext === "txt") return await extractTextFromTxt(file);
    throw new Error("Unsupported file type: " + ext);
  };

  const getUniqueTitle = (baseTitle, existingTitles) => {
    if (!existingTitles.includes(baseTitle)) return baseTitle;

    let counter = 1;
    let newTitle = `${baseTitle} (${counter})`;
    while (existingTitles.includes(newTitle)) {
      counter++;
      newTitle = `${baseTitle} (${counter})`;
    }
    return newTitle;
  };

  const handleUpload = async () => {
    if (!contentFile || !questionsFile) {
      // If files are missing, show the SweetAlert
      Swal.fire({
        title: "Missing Files",
        text: "Both content and questions files are required!",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const baseTitle = title || titlePlaceholder;
    if (!baseTitle) return;

    setUploading(true);
    try {
      const contentText = await extractTextFromFile(contentFile);
      const questionsText = await extractTextFromFile(questionsFile);

      const existingTitles = documents.map((doc) => doc.id);
      const uniqueTitle = getUniqueTitle(baseTitle, existingTitles);

      const docRef = doc(db, "knowledge", uniqueTitle);
      await setDoc(docRef, {
        content: contentText,
        questions: questionsText,
        uploadedAt: new Date().toISOString(),
      });

      // Parse questions and upload to /dashboard/pie chart/questions/{title}
      const individualQuestions = questionsText
        .split("?")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      const questionsData = {};
      individualQuestions.forEach((q) => {
        questionsData[`${q}?`] = 0;
      });

      questionsData["other questions"] = 0;

      const chartDocRef = doc(db, "dashboard/pie chart/questions", uniqueTitle);
      await setDoc(chartDocRef, questionsData, { merge: true });


      Swal.fire({
        title: "Upload Successful",
        text: `Document saved as "${uniqueTitle}"`,
        icon: "success",
        confirmButtonText: "Great!",
      });
      setTitle("");
      setContentFile(null);
      setQuestionsFile(null);
      setTitlePlaceholder("");

      const docSnapshot = await getDocs(collection(db, "knowledge"));
      const newDocs = docSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(newDocs);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  const generateQuestionsFromContent = async () => {
    if (!contentFile) return;

    try {
      const contentText = await extractTextFromFile(contentFile);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `Context: ${contentText}` },
                  {
                    text:
                      "Generate 20 concise questions based on the above context. Keep them direct and clear. Do not use any means of numbering in making the questions",
                  },
                ],
              },
            ],
          })
        }
      );

      const data = await response.json();
      const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (output) {
        const cleaned = output.trim();
        setQuestionsFile(null); // Clear existing file
        Swal.fire({
          title: "Questions Generated",
          text: "The questions were generated from the content file.",
          icon: "success",
          confirmButtonText: "OK",
        });

        // Store questions in a temporary text file-like object for uploading
        const blob = new Blob([cleaned], { type: "text/plain" });
        const generatedFile = new File([blob], "generated_questions.txt", {
          type: "text/plain",
        });
        setQuestionsFile(generatedFile);
      } else {
        throw new Error("No output received from Gemini.");
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
      Swal.fire({
        title: "Generation Failed",
        text: "An error occurred while generating questions.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <div className="manage-orion-container">
      <h1>Manage Orion</h1>
      <button
        onClick={() => setShowModal(true)}
        className="manage-orion-button manage-orion-button-icon"
      >
        <span className="manage-orion-button-icon-wrapper">
          <span>Upload Knowledge and Questions</span>
          <Upload size={13} />
        </span>
      </button>
      {showModal && (
        <div className="manage-orion-modal-backdrop">
          <div className="manage-orion-modal">
            <div>
              <div className="document-title-wrapper">
                <label>
                  <strong>Document Title</strong>
                </label>
                <p className="document-title-note">
                  Note: Uploading with the same title adds an incrementing
                  number after the title, e.g., Title Example (1)
                </p>
                <div className="input-with-folder">
                  <input
                    type="text"
                    value={title}
                    placeholder={titlePlaceholder}
                    onChange={(e) => setTitle(e.target.value)}
                    className="manage-orion-input"
                  />
                  <FaFolderOpen
                    size={48}
                    style={{ cursor: "pointer" }}
                    onClick={() => fileInputRef.current.click()}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleManualFilePick}
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: "none" }}
                  />
                </div>
              </div>
              <div
                onDrop={handleFileDrop("content")}
                onDragOver={(e) => e.preventDefault()}
                className="manage-orion-dropzone"
              >
                {contentFile ? (
                  <div className="manage-orion-file-info">
                    <p className="manage-orion-p">
                      {getFileIcon(contentFile)} {contentFile.name}
                      <FaTimes
                        size={14}
                        style={{ marginLeft: 10, cursor: "pointer" }}
                        onClick={() => setContentFile(null)}
                        color="red"
                      />
                    </p>

                    <p className="manage-orion-p file-size">
                      File Size: {formatFileSize(contentFile.size)}
                    </p>
                  </div>
                ) : (
                  <p className="manage-orion-p">
                    Drag and drop a <strong>Word, PDF, or TXT</strong> file here
                    for Content
                  </p>
                )}
              </div>

              <div className="questions-dropzone-with-icon">
                <div
                  onDrop={handleFileDrop("questions")}
                  onDragOver={(e) => e.preventDefault()}
                  className="manage-orion-dropzone"
                >
                  {questionsFile ? (
                    <div className="manage-orion-file-info">
                      <p className="manage-orion-p">
                        {getFileIcon(questionsFile)} {questionsFile.name}
                        <FaTimes
                          size={14}
                          style={{ marginLeft: 10, cursor: "pointer" }}
                          onClick={() => setQuestionsFile(null)}
                          color="red"
                        />
                      </p>
                      <p className="manage-orion-p file-size">
                        File Size: {formatFileSize(questionsFile.size)}
                      </p>
                    </div>
                  ) : (
                    <p className="manage-orion-p">
                      Drag and drop a <strong>Word, PDF, or TXT</strong> file here for Questions
                    </p>
                  )}
                </div>

                {/* Move the magic wand icon to the top right and make it disappear when questionsFile exists */}
                {!questionsFile && contentFile && (
                  <BiSolidMagicWand
                    size={24}
                    color="#6c63ff"
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                    title="Auto-generate Questions"
                    onClick={generateQuestionsFromContent}
                  />
                )}
              </div>


              <button
                disabled={!contentFile || !questionsFile || uploading}
                onClick={handleUpload}
                className="manage-orion-button"
              >
                {uploading ? "Uploading..." : "Upload to Firestore"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="manage-orion-button"
                style={{ marginLeft: "1rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit modal */}
      {isEditing && (
        <div className="manage-orion-modal-backdrop">
          <div className="manage-orion-modal">
            <h2>Edit Document</h2>
            <div className="document-title-wrapper">
              <label>
                <strong>Document Title</strong>
              </label>
              {/* Make the title editable */}
              <input
                type="text"
                value={editDoc.id} // Edit this line to bind it to the title instead of `editDoc.id`
                onChange={(e) =>
                  setEditDoc((prev) => ({ ...prev, id: e.target.value }))
                }
                className="manage-orion-input"
              />
            </div>
            <div>
              <label>
                <strong>Content</strong>
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="manage-orion-textarea"
              />
            </div>
            <div>
              <label>
                <strong>Questions</strong>
              </label>
              <textarea
                value={editQuestions}
                onChange={(e) => setEditQuestions(e.target.value)}
                className="manage-orion-textarea"
              />
            </div>
            <div>
              <button onClick={handleSaveEdit} className="manage-orion-button">
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="manage-orion-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="knowledge-table-wrapper">
        <table className="knowledge-table" style={{ marginTop: "1.5rem" }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Content</th>
              <th>Questions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.id}</td>
                <td>{doc.content.substring(0, 50)}...</td>
                <td>{doc.questions.substring(0, 50)}...</td>
                <td>
                  <Button
                    variant="outline"
                    className="edit-btn"
                    onClick={() => handleEdit(doc.id)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    className="delete-btn"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageOrion;
