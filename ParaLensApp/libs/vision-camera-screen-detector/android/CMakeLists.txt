project(VisionCameraScreenDetector)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME VisionCameraScreenDetector)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
)

# Enable React Native's official C++ flags
if(DEFINED REACT_ANDROID_DIR AND EXISTS "${REACT_ANDROID_DIR}/../ReactCommon/cmake-utils/react-native-flags.cmake")
        set(REACT_COMMON_DIR ${REACT_ANDROID_DIR}/../ReactCommon)
        include(${REACT_COMMON_DIR}/cmake-utils/react-native-flags.cmake)
        target_compile_reactnative_options(${PACKAGE_NAME} PRIVATE)
else()
        target_compile_definitions(${PACKAGE_NAME} PRIVATE RN_SERIALIZABLE_STATE)
endif()

# Add Nitrogen-generated specs (sources, includes, libraries)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/VisionCameraScreenDetector+autolinking.cmake)

# Local includes
include_directories(
        "src/main/cpp"
)

find_library(LOG_LIB log)

# VisionCamera v5 prefab — provides <VisionCamera/HybridFrameSpec.hpp> etc.,
# referenced by the generated spec because detectScreen takes a Frame.
find_package(react-native-vision-camera REQUIRED CONFIG)

# Link core libraries
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
        react-native-vision-camera::VisionCamera
)
