import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

export default function Home() {
  return (
    <div className="relative min-h-screen text-white">
      <div
        className="absolute inset-0 bg-fixed bg-cover bg-center"
        style={{
          backgroundImage: 'url("/middle-east-wheat.jpg")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.8,
          zIndex: -1,
        }}
      ></div>
      <Header />
      <div className="flex flex-col items-center text-center px-6 py-12">
        <div className="bg-black bg-opacity-60 p-6 rounded-lg max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to The Way of Messiah
          </h1>
          <p className="text-lg italic text-blue-200 mb-8">
            "About that time there came to be great disturbance concerning the
            Way of Yahuah." – Acts 19:23
          </p>
          <div className="text-gray-100 text-left space-y-6">
            <div>
              <strong className="block text-xl mb-2">Home Assemblies</strong>
              <p>
                We believe that the biblical model of meeting in private homes
                is the best way to create an atmosphere of personal
                accountability and self-governance. During the first century,
                the believers could not use the Synagogue as a place of worship
                and spiritual education, as they were persecuted by the Jewish
                leaders, who did not acknowledge or accept Yahusha as the
                Messiah. Therefore, they met in the homes of each other and were
                trained in the doctrine of Yahusha, the Son of Yahuah (or
                Yahuah, the Almighty One), as they preached the Gospel from
                house to house.
              </p>
            </div>

            <div>
              <strong className="block text-xl mb-2">Giving</strong>
              <p>
                We believe what the Bible admonishes about giving, that it
                should be:
              </p>
              <ul className="list-disc list-inside">
                <li>Sacrificial</li>
                <li>Generous</li>
                <li>Reciprocal</li>
                <li>Willing</li>
              </ul>
            </div>

            <div>
              <strong className="block text-xl mb-2">Tithing</strong>
              <p>
                We do not practice tithing, which is the giving of a tenth of
                your earnings, but only ask that one gives according to what
                their heart has resolved.
              </p>
            </div>

            <div>
              <strong className="block text-xl mb-2">Schools</strong>
              <p>
                It is said that "knowledge is power," and with the right
                knowledge one can achieve great things! The vision of our
                ministry is to open schools to train both young and old in
                various fields of study.
              </p>
            </div>
          </div>
          <div className="space-x-4 mt-8">
            <Link
              to="/submit-testimony"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Submit Testimony
            </Link>
            <Link
              to="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Admin Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
