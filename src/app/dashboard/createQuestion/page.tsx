"use client";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import React, { useState } from "react";

const CreateQuestion = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await axios.post(
        "/api/travellerquestions/createQuestions",
        { title, content }
      );
      setContent("");
      setTitle("");
      toast({
        description: "Question created successfully",
      });
      console.log(response.data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to save question.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Heading
        heading="Create Question"
        subheading="Create a new question by filling the details below."
      />
      <div className="max-w-7xl mx-auto p-6  rounded-md">
        {message && (
          <p
            className={`mb-4 text-sm ${
              message.includes("successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block font-medium">
              Title
            </label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your question title"
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="block font-medium">
              Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the question details"
              rows={5}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </Button>
        </form>
      </div>
    </>
  );
};

export default CreateQuestion;
