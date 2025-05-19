import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Clock, FileText, Phone, AlertCircle } from 'lucide-react';
import { MdEmail } from 'react-icons/md';

const RequesterHome = () => {
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Message sent:", formData);
    setFormData({ name: "", email: "", message: "" });
    alert("Message sent successfully!");
  };

  const requestSteps = [
    {
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      title: "Submit Request",
      description: "Fill out a detailed blood request form with patient information."
    },
    {
      icon: <Search className="w-8 h-8 text-blue-500" />,
      title: "Find Donors",
      description: "We'll match you with eligible donors in your area."
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      title: "Quick Response",
      description: "Receive prompt assistance based on urgency level."
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="w-full px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Need Blood?
            <span className="text-blue-600"> We're Here to Help</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 mx-auto max-w-3xl">
            Quick and efficient blood request processing. Our network of donors is ready to help save lives.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/request-form" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
              >
                Request Blood
              </motion.button>
            </Link>
            <Link to="/emergency" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Emergency Request
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Request Process */}
      <section className="w-full px-4 py-16 bg-white sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How Blood Request Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {requestSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-white p-6 rounded-xl shadow-soft text-center h-full"
            >
              <div className="flex justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Priority Levels */}
      <section className="w-full px-4 py-16 bg-blue-50 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Request Priority Levels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-green-500 h-full">
            <h3 className="text-xl font-semibold mb-2 text-green-600">Normal</h3>
            <p className="text-gray-600">For planned procedures and non-emergency transfusions.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-yellow-500 h-full">
            <h3 className="text-xl font-semibold mb-2 text-yellow-600">Urgent</h3>
            <p className="text-gray-600">Required within 24-48 hours for critical patients.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-red-500 h-full">
            <h3 className="text-xl font-semibold mb-2 text-red-600">Emergency</h3>
            <p className="text-gray-600">Immediate requirement for life-threatening situations.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="w-full px-4 py-16 bg-white sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              24/7 Support Available
            </h2>
            <p className="text-gray-600 mb-8">
              Our emergency response team is available round the clock for urgent blood requirements.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-blue-600" />
                <span className="text-gray-700">Emergency Hotline: +91-11-23711551</span>
              </div>
              <div className="flex items-center gap-3">
                <MdEmail className="w-6 h-6 text-blue-600" />
                <span className="text-gray-700">
                  Email us at <a href="mailto:flow4life.info@gmail.com" className="text-blue-600 underline">flow4life.info@gmail.com</a>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl shadow-soft w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <textarea
                name="message"
                placeholder="Your Message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              ></textarea>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RequesterHome;