plugins {
    kotlin("jvm") version "1.9.10"
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))
    implementation("aws.sdk.kotlin:dynamodb:1.0.0")
}

kotlin {
    jvmToolchain(17)
}
