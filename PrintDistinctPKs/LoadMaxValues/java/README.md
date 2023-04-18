# CLI Parameters

The LaodMaxValues class accepts --region <AWS Region> as a required parameter, or you can
pass in environment variables for the AWS_DEFAULT_REGION as is done with docker below.

# How to build and run using docker

docker build -t load-max-values .

docker run --rm -it \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION \
  load-max-values
