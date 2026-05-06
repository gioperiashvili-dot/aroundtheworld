const express = require("express");
const router = express.Router();
const { getPublishedBlogBySlug, getPublishedBlogs } = require("../services/blogs");

router.get("/", async (_req, res) => {
  try {
    const blogs = await getPublishedBlogs();

    return res.json({
      blogs,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOGS_LOAD_FAILED",
      error: error.message || "Unable to load blog posts",
      details: error.details || "Please try again in a moment.",
      blogs: [],
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const blog = await getPublishedBlogBySlug(req.params.slug);

    if (!blog) {
      return res.status(404).json({
        code: "BLOG_NOT_FOUND",
        error: "Blog post not found",
        details: "We could not find a published blog post with that slug.",
      });
    }

    return res.json({
      blog,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOG_LOAD_FAILED",
      error: error.message || "Unable to load blog post",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
