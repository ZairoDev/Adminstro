"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Heading from "@/components/Heading";

interface PageProps {
  params: {
    id: string;
  };
}

const UpdateQuestion = ({ params }: PageProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchQuestionData(params.id);
    }
  }, [params.id]);

  const fetchQuestionData = async (id: string) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await axios.post(
        "/api/travellerquestions/getSingleQuestion",
        {
          questionId: id,
        }
      );
      if (response.data) {
        setTitle(response.data.data.title || "");
        setContent(response.data.data.content || "");
      } else {
        setMessage("Question not found.");
      }
    } catch (error) {
      setMessage("Error fetching question data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage("Title and content cannot be empty.");
      return;
    }
    setUpdating(true);
    setMessage("");
    try {
      const response = await axios.post(
        "/api/travellerquestions/updateQuestion",
        {
          questionId: params.id,
          title,
          content,
        }
      );
      if (response.data.success) {
        setMessage("Question updated successfully!");
      } else {
        setMessage("Failed to update the question.");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Error updating question.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Heading
        heading="Update Questiomn"
        subheading="Update the question data by filling the details below."
      />

      {loading ? (
        <div className="flex justify-center items-center">
          <Loader2 className="animate-spin " size={18} />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
          <Textarea
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full"
          />
          <Button onClick={handleUpdate} disabled={updating} className="">
            {updating ? (
              <div className="flex">
                <span>Updating</span>
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              "Update Question"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateQuestion;
